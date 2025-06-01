import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

export const useContasLogic = () => {
  const [user, setUser] = useState<any>(null);
  const [showNewBillModal, setShowNewBillModal] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [editingAdjustment, setEditingAdjustment] = useState<{billId: string, currentValue: number} | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log("🔐 Verificando autenticação...");
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      console.log("👤 Usuário autenticado:", session?.user?.email || "Nenhum");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      console.log("🔄 Mudança de auth:", session?.user?.email || "Nenhum");
    });

    return () => subscription.unsubscribe();
  }, []);

  // Buscar contas cadastradas
  const { data: bills = [] } = useQuery({
    queryKey: ['recurring-bills', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log("📋 Buscando contas para usuário:", user.id);
      const { data, error } = await supabase
        .from('recurring_bills')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date');
      
      if (error) {
        console.error("❌ Erro ao buscar contas:", error);
        throw error;
      }
      console.log("✅ Contas encontradas:", data?.length || 0);
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
      console.log("💾 Iniciando criação de conta:", data);
      console.log("👤 Usuário atual:", user?.email);
      
      if (!user?.id) {
        console.error("❌ Usuário não autenticado");
        throw new Error('Usuário não autenticado');
      }

      const billData = {
        ...data,
        value: parseFloat(data.value),
        due_date: parseInt(data.due_date),
        bank: data.bank || '',
        user_id: user.id
      };
      
      console.log("📊 Dados processados para inserção:", billData);

      const { data: result, error } = await supabase
        .from('recurring_bills')
        .insert([billData])
        .select();
      
      if (error) {
        console.error("❌ Erro do Supabase:", error);
        throw error;
      }
      
      console.log("✅ Conta criada com sucesso:", result);
      return result;
    },
    onSuccess: () => {
      console.log("🎉 Sucesso na criação da conta");
      toast({
        title: "Conta cadastrada",
        description: "Conta adicionada com sucesso!",
      });
      setShowNewBillModal(false);
      setEditingBill(null);
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
    },
    onError: (error) => {
      console.error("💥 Erro na mutation:", error);
      toast({
        title: "Erro",
        description: `Erro ao cadastrar conta: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateBillMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RecurringBill> }) => {
      const { error } = await supabase
        .from('recurring_bills')
        .update({
          ...data,
          bank: data.bank || ''
        })
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
    mutationFn: async ({ billId, value, month }: { billId: string; value: number; month: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      console.log("💾 Salvando ajuste:", { billId, value, month, user_id: user.id });
      
      const { error } = await supabase
        .from('bill_adjustments')
        .upsert([{
          bill_id: billId,
          month: month,
          adjusted_value: value,
          user_id: user.id
        }]);
      
      if (error) throw error;
    },
    onSuccess: (_, { month }) => {
      toast({
        title: "Valor ajustado",
        description: `Valor da conta ajustado para ${month}!`,
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
    
    // Considerar apenas C6 BANK, ASAAS e CONTA SIMPLES para o saldo restante
    const relevantBanks = ['C6 BANK', 'ASAAS', 'CONTA SIMPLES'];
    const totalCashForBills = relevantBanks.reduce((sum, bank) => {
      return sum + (currentBalances[bank] || 0);
    }, 0);
    
    // Total geral de todos os bancos para outros cálculos
    const totalCash = Object.values(currentBalances).reduce((sum, balance) => sum + balance, 0);
    
    return {
      totalBills,
      paidBills,
      unpaidBills,
      totalCash,
      remainingCash: totalCashForBills - unpaidBills
    };
  };

  return {
    user,
    setUser,
    showNewBillModal,
    setShowNewBillModal,
    editingBill,
    setEditingBill,
    editingAdjustment,
    setEditingAdjustment,
    bills,
    billAdjustments,
    bankBalances,
    monthlyItems,
    createBillMutation,
    updateBillMutation,
    adjustBillMutation,
    deleteBillMutation,
    togglePaidMutation,
    getCurrentBillValue,
    calculateCurrentBalances,
    calculateTotals
  };
};
