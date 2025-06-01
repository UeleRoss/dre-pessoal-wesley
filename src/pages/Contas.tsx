
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Auth from "@/components/Auth";
import ContasSummaryCards from "@/components/contas/ContasSummaryCards";
import BillForm from "@/components/contas/BillForm";
import BillsList from "@/components/contas/BillsList";
import BankBalancesCard from "@/components/contas/BankBalancesCard";
import ValueAdjustmentModal from "@/components/contas/ValueAdjustmentModal";

const BANKS = ['CONTA SIMPLES', 'BRADESCO', 'C6 BANK', 'ASAAS', 'NOMAD'];

interface RecurringBill {
  id: string;
  name: string;
  value: number;
  due_date: number;
  category: string;
  bank: string;
  recurring: boolean;
  paid_this_month: boolean;
}

interface BillAdjustment {
  id: string;
  bill_id: string;
  month: string;
  adjusted_value: number;
  user_id: string;
}

const Contas = () => {
  const [user, setUser] = useState<any>(null);
  const [showNewBillModal, setShowNewBillModal] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [editingAdjustment, setEditingAdjustment] = useState<{billId: string, currentValue: number} | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Buscar contas cadastradas
  const { data: bills = [] } = useQuery({
    queryKey: ['recurring-bills', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('recurring_bills')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Buscar ajustes mensais
  const { data: billAdjustments = [] } = useQuery({
    queryKey: ['bill-adjustments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      const { data, error } = await supabase
        .from('bill_adjustments')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Buscar saldos dos bancos
  const { data: bankBalances = [] } = useQuery({
    queryKey: ['bank-balances'],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('bank_balances')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Buscar lançamentos do mês atual para calcular saldo atualizado
  const { data: monthlyItems = [] } = useQuery({
    queryKey: ['monthly-items-contas', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const createBillMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('recurring_bills')
        .insert([{
          ...data,
          value: parseFloat(data.value),
          due_date: parseInt(data.due_date),
          user_id: user.id
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Conta cadastrada",
        description: "Conta adicionada com sucesso!",
      });
      setShowNewBillModal(false);
      setEditingBill(null);
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar conta.",
        variant: "destructive",
      });
    }
  });

  const updateBillMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RecurringBill> }) => {
      const { error } = await supabase
        .from('recurring_bills')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Conta atualizada",
        description: "Alterações salvas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar conta.",
        variant: "destructive",
      });
    }
  });

  const adjustBillMutation = useMutation({
    mutationFn: async ({ billId, value }: { billId: string; value: number }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      const { error } = await supabase
        .from('bill_adjustments')
        .upsert([{
          bill_id: billId,
          month: currentMonth,
          adjusted_value: value,
          user_id: user.id
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Valor ajustado",
        description: "Valor da conta ajustado para este mês!",
      });
      setEditingAdjustment(null);
      queryClient.invalidateQueries({ queryKey: ['bill-adjustments'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao ajustar valor da conta.",
        variant: "destructive",
      });
    }
  });

  const deleteBillMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_bills')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Conta excluída",
        description: "Conta removida com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir conta.",
        variant: "destructive",
      });
    }
  });

  const togglePaidMutation = useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error } = await supabase
        .from('recurring_bills')
        .update({ paid_this_month: paid })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
    }
  });

  const handleSubmit = (formData: any) => {
    if (editingBill) {
      updateBillMutation.mutate({
        id: editingBill.id,
        data: {
          ...formData,
          value: parseFloat(formData.value),
          due_date: parseInt(formData.due_date)
        }
      });
      setEditingBill(null);
      setShowNewBillModal(false);
    } else {
      createBillMutation.mutate(formData);
    }
  };

  const handleEdit = (bill: RecurringBill) => {
    setEditingBill(bill);
    setShowNewBillModal(true);
  };

  const handleAdjustValue = (billId: string, currentValue: number) => {
    setEditingAdjustment({ billId, currentValue });
  };

  const submitAdjustment = (value: number) => {
    if (!editingAdjustment) return;
    
    adjustBillMutation.mutate({
      billId: editingAdjustment.billId,
      value: value
    });
  };

  // Função para obter o valor atual da conta (considerando ajustes)
  const getCurrentBillValue = (bill: RecurringBill) => {
    const adjustment = billAdjustments.find(adj => adj.bill_id === bill.id);
    return adjustment ? adjustment.adjusted_value : bill.value;
  };

  // Calcular saldos atuais dos bancos
  const calculateCurrentBalances = () => {
    const balances: Record<string, number> = {};
    
    BANKS.forEach(bank => {
      const bankConfig = bankBalances.find(b => b.bank_name === bank);
      const initialBalance = bankConfig?.initial_balance || 0;
      
      const bankMovements = monthlyItems
        .filter(item => item.bank === bank)
        .reduce((sum, item) => {
          return item.type === 'entrada' ? sum + Number(item.amount) : sum - Number(item.amount);
        }, 0);
      
      balances[bank] = initialBalance + bankMovements;
    });
    
    return balances;
  };

  // Calcular totais
  const calculateTotals = () => {
    const totalBills = bills.reduce((sum, bill) => sum + getCurrentBillValue(bill), 0);
    const paidBills = bills.filter(bill => bill.paid_this_month).reduce((sum, bill) => sum + getCurrentBillValue(bill), 0);
    const unpaidBills = totalBills - paidBills;
    
    const currentBalances = calculateCurrentBalances();
    const totalCash = Object.values(currentBalances).reduce((sum, balance) => sum + balance, 0);
    
    return {
      totalBills,
      paidBills,
      unpaidBills,
      totalCash,
      remainingCash: totalCash - unpaidBills
    };
  };

  const resetForm = () => {
    setEditingBill(null);
  };

  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  const totals = calculateTotals();
  const currentBalances = calculateCurrentBalances();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-800">Contas Recorrentes</h1>
          <p className="text-navy-600 mt-1">Gerencie suas contas fixas e previsão de caixa</p>
        </div>
        
        <Dialog open={showNewBillModal} onOpenChange={setShowNewBillModal}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBill ? 'Editar Conta' : 'Nova Conta Recorrente'}</DialogTitle>
            </DialogHeader>
            
            <BillForm
              editingBill={editingBill}
              onSubmit={handleSubmit}
              onCancel={() => setShowNewBillModal(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <ContasSummaryCards 
        totals={totals}
        billsCount={{
          total: bills.length,
          paid: bills.filter(b => b.paid_this_month).length
        }}
      />

      <BillsList
        bills={bills}
        billAdjustments={billAdjustments}
        onTogglePaid={(billId, paid) => togglePaidMutation.mutate({ id: billId, paid })}
        onEdit={handleEdit}
        onDelete={(billId) => deleteBillMutation.mutate(billId)}
        onAdjustValue={handleAdjustValue}
      />

      <ValueAdjustmentModal
        isOpen={!!editingAdjustment}
        onClose={() => setEditingAdjustment(null)}
        onSubmit={submitAdjustment}
        currentValue={editingAdjustment?.currentValue || 0}
      />

      <BankBalancesCard
        currentBalances={currentBalances}
        bills={bills}
      />
    </div>
  );
};

export default Contas;
