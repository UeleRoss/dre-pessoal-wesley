
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Auth from "@/components/Auth";
import InvestmentCategoryManager from "@/components/InvestmentCategoryManager";
import InvestmentSummaryCards from "./investimentos/InvestmentSummaryCards";
import NewInvestmentModal from "./investimentos/NewInvestmentModal";
import TransactionModal from "./investimentos/TransactionModal";
import InvestmentsList from "./investimentos/InvestmentsList";
import { useInvestmentCategories, useInvestments, useInvestmentTransactions } from "./investimentos/useInvestmentQueries";
import { useInvestmentMutations } from "./investimentos/useInvestmentMutations";
import type { Investment } from "./investimentos/types";

const Investimentos = () => {
  const [user, setUser] = useState<any>(null);
  const [showNewInvestmentModal, setShowNewInvestmentModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [transactionType, setTransactionType] = useState<'aporte' | 'retirada'>('aporte');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: investmentCategories = [] } = useInvestmentCategories(user);
  const { data: investments = [] } = useInvestments(user);
  const { data: transactions = [] } = useInvestmentTransactions(user);
  
  const { 
    createInvestmentMutation, 
    createTransactionMutation, 
    deleteInvestmentMutation 
  } = useInvestmentMutations(user);

  const openTransactionModal = (investment: Investment, type: 'aporte' | 'retirada') => {
    setSelectedInvestment(investment);
    setTransactionType(type);
    setShowTransactionModal(true);
  };

  const handleCreateInvestment = (data: any) => {
    createInvestmentMutation.mutate(data);
    setShowNewInvestmentModal(false);
  };

  const handleCreateTransaction = (data: any) => {
    createTransactionMutation.mutate(data);
    setShowTransactionModal(false);
  };

  const handleDeleteInvestment = (id: string) => {
    deleteInvestmentMutation.mutate(id);
  };

  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-800">Investimentos</h1>
          <p className="text-navy-600 mt-1">Gerencie seus investimentos e aportes</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Categorias
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Gerenciar Categorias de Investimento</DialogTitle>
              </DialogHeader>
              <InvestmentCategoryManager />
            </DialogContent>
          </Dialog>

          <Button onClick={() => setShowNewInvestmentModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Investimento
          </Button>
        </div>
      </div>

      <InvestmentSummaryCards investments={investments} />

      <InvestmentsList
        investments={investments}
        transactions={transactions}
        onAporte={(investment) => openTransactionModal(investment, 'aporte')}
        onRetirada={(investment) => openTransactionModal(investment, 'retirada')}
        onDelete={handleDeleteInvestment}
        isDeleting={deleteInvestmentMutation.isPending}
      />

      <NewInvestmentModal
        open={showNewInvestmentModal}
        onOpenChange={setShowNewInvestmentModal}
        categories={investmentCategories}
        onSubmit={handleCreateInvestment}
        isLoading={createInvestmentMutation.isPending}
      />

      <TransactionModal
        open={showTransactionModal}
        onOpenChange={setShowTransactionModal}
        investment={selectedInvestment}
        type={transactionType}
        onSubmit={handleCreateTransaction}
        isLoading={createTransactionMutation.isPending}
      />
    </div>
  );
};

export default Investimentos;
