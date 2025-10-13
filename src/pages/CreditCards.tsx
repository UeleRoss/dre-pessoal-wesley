import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useInvoices } from "@/hooks/useInvoices";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Loader2, Settings } from "lucide-react";
import InvoiceCard from "@/components/InvoiceCard";
import AddCreditCardModal from "@/components/AddCreditCardModal";
import InvoiceDetailModal from "@/components/InvoiceDetailModal";
import { CreditCardInvoice } from "@/types/financial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CreditCards = () => {
  const [user, setUser] = useState<any>(null);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<CreditCardInvoice | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const { creditCards, isLoading: cardsLoading } = useCreditCards(user?.id);
  const { invoices, isLoading: invoicesLoading, refetch: refetchInvoices } = useInvoices(user?.id);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleMarkAsPaid = async (creditCardId: string, referenceMonth: string) => {
    const invoice = invoices?.find(
      inv => inv.credit_card_id === creditCardId && inv.reference_month === referenceMonth
    );
    if (invoice) {
      setSelectedInvoice(invoice);
    }
  };

  const handleCloseDetailModal = () => {
    setSelectedInvoice(null);
    refetchInvoices();
  };

  // Filter invoices by month
  const currentMonthInvoices = invoices?.filter(inv => {
    const invDate = new Date(inv.reference_month);
    return invDate.getMonth() === selectedMonth.getMonth() &&
           invDate.getFullYear() === selectedMonth.getFullYear();
  }) || [];

  const previousMonthDate = new Date(selectedMonth);
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);

  const previousMonthInvoices = invoices?.filter(inv => {
    const invDate = new Date(inv.reference_month);
    return invDate.getMonth() === previousMonthDate.getMonth() &&
           invDate.getFullYear() === previousMonthDate.getFullYear();
  }) || [];

  // Calculate totals
  const currentMonthTotal = currentMonthInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const currentMonthPaid = currentMonthInvoices.filter(inv => inv.is_paid).length;

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const isLoading = cardsLoading || invoicesLoading;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CreditCard className="h-8 w-8" />
            Cartões de Crédito
          </h1>
          <p className="text-gray-600 mt-1">Gerencie suas faturas e cartões</p>
        </div>
        <Button onClick={() => setShowAddCardModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cartão
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Mês Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMonthTotal.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {currentMonthInvoices.length} {currentMonthInvoices.length === 1 ? 'fatura' : 'faturas'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Faturas Pagas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {currentMonthPaid}/{currentMonthInvoices.length}
            </div>
            <p className="text-xs text-gray-600 mt-1">no mês atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Cartões Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {creditCards?.length || 0}
            </div>
            <p className="text-xs text-gray-600 mt-1">cadastrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Month Tabs */}
      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="current">
            Mês Atual ({selectedMonth.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })})
          </TabsTrigger>
          <TabsTrigger value="previous">
            Mês Anterior ({previousMonthDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })})
          </TabsTrigger>
        </TabsList>

        {/* Current Month Tab */}
        <TabsContent value="current" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : currentMonthInvoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 text-center">
                  Nenhuma fatura encontrada para o mês atual
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Adicione lançamentos com cartão de crédito para visualizar as faturas
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentMonthInvoices.map((invoice) => (
                <InvoiceCard
                  key={`${invoice.credit_card_id}-${invoice.reference_month}`}
                  invoice={invoice}
                  onViewDetails={setSelectedInvoice}
                  onMarkAsPaid={handleMarkAsPaid}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Previous Month Tab */}
        <TabsContent value="previous" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : previousMonthInvoices.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 text-center">
                  Nenhuma fatura encontrada para o mês anterior
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {previousMonthInvoices.map((invoice) => (
                <InvoiceCard
                  key={`${invoice.credit_card_id}-${invoice.reference_month}`}
                  invoice={invoice}
                  onViewDetails={setSelectedInvoice}
                  onMarkAsPaid={handleMarkAsPaid}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Registered Cards Section */}
      {creditCards && creditCards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Cartões Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {creditCards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: card.color + '20' }}
                  >
                    <CreditCard className="h-5 w-5" style={{ color: card.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{card.name}</div>
                    <div className="text-sm text-gray-600">
                      Vencimento: dia {card.due_day} • Fechamento: dia {card.closing_day}
                    </div>
                    {card.credit_limit && (
                      <div className="text-xs text-gray-500 mt-1">
                        Limite: {Number(card.credit_limit).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <AddCreditCardModal
        isOpen={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
        onSuccess={refetchInvoices}
        userId={user.id}
      />

      <InvoiceDetailModal
        isOpen={!!selectedInvoice}
        onClose={handleCloseDetailModal}
        invoice={selectedInvoice}
        userId={user.id}
        onUpdate={refetchInvoices}
      />
    </div>
  );
};

export default CreditCards;
