import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Calendar,
  Repeat,
  CheckCircle,
  Save,
  Loader2
} from "lucide-react";
import { CreditCardInvoice, FinancialItem } from "@/types/financial";
import { formatBrazilDate } from "@/utils/dateUtils";
import { useInvoices } from "@/hooks/useInvoices";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: CreditCardInvoice | null;
  userId: string;
  onUpdate: () => void;
}

const InvoiceDetailModal = ({
  isOpen,
  onClose,
  invoice,
  userId,
  onUpdate
}: InvoiceDetailModalProps) => {
  const { toast } = useToast();
  const { markAsPaid, addNote } = useInvoices(userId);
  const [notes, setNotes] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Fetch invoice items
  const { data: invoiceItems = [], isLoading } = useQuery({
    queryKey: ['invoice-items', invoice?.credit_card_id, invoice?.reference_month],
    queryFn: async () => {
      if (!invoice) return [];

      // Parse reference_month (formato: YYYY-MM-DD)
      const refMonth = invoice.reference_month;
      const [year, month] = refMonth.split('-').map(Number);

      // Primeiro e último dia do mês
      const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .eq('user_id', userId)
        .eq('credit_card', invoice.card_name)
        .eq('type', 'saida')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as FinancialItem[];
    },
    enabled: isOpen && !!invoice,
  });

  // Fetch existing notes
  const { data: paymentData } = useQuery({
    queryKey: ['invoice-payment', invoice?.credit_card_id, invoice?.reference_month],
    queryFn: async () => {
      if (!invoice) return null;

      const { data, error } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('user_id', userId)
        .eq('credit_card_id', invoice.credit_card_id)
        .eq('reference_month', invoice.reference_month)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: isOpen && !!invoice,
  });

  const handleMarkAsPaid = async () => {
    if (!invoice) return;

    try {
      await markAsPaid.mutateAsync({
        cardId: invoice.credit_card_id,
        referenceMonth: invoice.reference_month,
        paid: true,
      });

      toast({
        title: "Fatura marcada como paga!",
        description: `A fatura de ${invoice.card_name} foi marcada como paga.`,
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao marcar fatura",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveNote = async () => {
    if (!invoice || !notes.trim()) return;

    setIsSavingNote(true);
    try {
      await addNote.mutateAsync({
        cardId: invoice.credit_card_id,
        referenceMonth: invoice.reference_month,
        note: notes.trim(),
      });

      toast({
        title: "Nota salva!",
        description: "A observação foi adicionada à fatura.",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar nota",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  if (!invoice) return null;

  const referenceDate = new Date(invoice.reference_month);
  const monthName = referenceDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: invoice.color + '20' }}
            >
              <CreditCard
                className="h-5 w-5"
                style={{ color: invoice.color }}
              />
            </div>
            <div>
              <div>{invoice.card_name}</div>
              <div className="text-sm font-normal text-gray-600 capitalize">{monthName}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Valor Total</div>
                <div className="text-2xl font-bold text-gray-900">
                  {Number(invoice.total_amount).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </div>
              </div>
              <div className="text-right">
                {invoice.is_paid ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Paga em {invoice.payment_date ? formatBrazilDate(invoice.payment_date) : 'N/A'}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="mb-2">
                    Pendente
                  </Badge>
                )}
                <div className="text-sm text-gray-600 mt-2">
                  Vencimento: Dia {invoice.due_day}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xs text-gray-600">Total de Itens</div>
                <div className="text-xl font-bold text-gray-900">{invoice.total_items}</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xs text-gray-600">Recorrentes</div>
                <div className="text-xl font-bold text-blue-700">{invoice.recurring_items}</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xs text-gray-600">Parceladas</div>
                <div className="text-xl font-bold text-purple-700">{invoice.installment_items}</div>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Lançamentos da Fatura</h3>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : invoiceItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum lançamento encontrado nesta fatura
              </div>
            ) : (
              <div className="space-y-2">
                {invoiceItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{item.description}</span>
                        {item.is_recurring && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                            <Repeat className="h-3 w-3 mr-1" />
                            Recorrente
                          </Badge>
                        )}
                        {item.is_installment && (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                            <Calendar className="h-3 w-3 mr-1" />
                            {item.installment_number}/{item.total_installments}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatBrazilDate(item.date)} • {item.category}
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-red-600">
                      {Number(item.amount).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div>
            <Label htmlFor="invoice-notes">Observações da Fatura</Label>
            <Textarea
              id="invoice-notes"
              placeholder="Adicione observações sobre esta fatura..."
              value={notes || paymentData?.notes || ''}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-2"
            />
            {notes.trim() && notes !== paymentData?.notes && (
              <Button
                onClick={handleSaveNote}
                disabled={isSavingNote}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSavingNote ? 'Salvando...' : 'Salvar Observação'}
              </Button>
            )}
          </div>

          {/* Action Button */}
          {!invoice.is_paid && (
            <Button
              onClick={handleMarkAsPaid}
              disabled={markAsPaid.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              {markAsPaid.isPending ? 'Marcando...' : 'Marcar Fatura como Paga'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDetailModal;
