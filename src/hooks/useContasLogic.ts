import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

interface BillInstance {
  id: string;
  bill_id: string;
  month_reference: string;
  valor_ajustado: number | null;
  pago: boolean;
  user_id: string;
}

export const useContasLogic = (selectedMonth: Date) => {
  const [user, setUser] = useState<any>(null);
  const [showNewBillModal, setShowNewBillModal] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [editingAdjustment, setEditingAdjustment] = useState<{billId: string, currentValue: number} | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Formatação do mês para consultas
  const currentMonthKey = selectedMonth.toISOString().slice(0, 10).substring(0, 7) + '-01'; // YYYY-MM-01

  // Buscar bancos do usuário
  const { data: userBanks = [] } = useQuery({
    queryKey: ['user-banks-contas', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Buscar bancos configurados
      const { data: bankBalances, error: balanceError } = await supabase
        .from('bank_balances')
        .select('bank_name')
        .eq('user_id', user.id);
      
      if (balanceError) throw balanceError;

      // Buscar bancos dos lançamentos
      const { data: financialItems, error: itemsError } = await supabase
        .from('financial_items')
        .select('bank')
        .eq('user_id', user.id);
      
      if (itemsError) throw itemsError;

      const configuredBanks = bankBalances.map(b => b.bank_name);
      const transactionBanks = [...new Set(financialItems.map(item => item.bank))].filter(Boolean);
      
      return [...new Set([...configuredBanks, ...transactionBanks])].sort();
    },
    enabled: !!user?.id
  });

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

  // Buscar instâncias mensais das contas
  const { data: billInstances = [] } = useQuery({
    queryKey: ['bill-instances', user?.id, currentMonthKey],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log("📅 Buscando instâncias para mês:", currentMonthKey);
      const { data, error } = await supabase
        .from('recurring_bills_instances')
        .select('*')
        .eq('user_id', user.id)
        .eq('month_reference', currentMonthKey);
      
      if (error) throw error;
      console.log("✅ Instâncias encontradas:", data?.length || 0);
      return data;
    },
    enabled: !!user?.id
  });

  // Buscar ajustes mensais (mantido para compatibilidade)
  const { data: billAdjustments = [] } = useQuery({
    queryKey: ['bill-adjustments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const currentMonth = selectedMonth.toISOString().slice(0, 7); // YYYY-MM
      
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
    queryKey: ['monthly-items-contas', user?.id, currentMonthKey],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
      
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
    mutationFn: async ({ billId, value }: { billId: string; value: number }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      console.log("💾 Salvando ajuste mensal:", { billId, value, month: currentMonthKey, user_id: user.id });
      
      // Primeiro, verificar se já existe uma instância para este mês
      const { data: existingInstance } = await supabase
        .from('recurring_bills_instances')
        .select('*')
        .eq('bill_id', billId)
        .eq('month_reference', currentMonthKey)
        .eq('user_id', user.id)
        .single();

      if (existingInstance) {
        // Se existe, apenas atualizar o valor_ajustado
        const { error } = await supabase
          .from('recurring_bills_instances')
          .update({ valor_ajustado: value })
          .eq('id', existingInstance.id);
        
        if (error) throw error;
      } else {
        // Se não existe, criar nova instância com valor_ajustado
        const { error } = await supabase
          .from('recurring_bills_instances')
          .insert({
            bill_id: billId,
            month_reference: currentMonthKey,
            valor_ajustado: value,
            pago: false, // sempre iniciar como não pago
            user_id: user.id
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Valor ajustado",
        description: `Valor da conta ajustado para o mês selecionado!`,
      });
      setEditingAdjustment(null);
      queryClient.invalidateQueries({ queryKey: ['bill-instances'] });
    },
    onError: (error) => {
      console.error("💥 Erro ao ajustar valor:", error);
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
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      console.log("💾 Salvando status de pagamento:", { billId: id, paid, month: currentMonthKey });
      
      // Primeiro, verificar se já existe uma instância para este mês
      const { data: existingInstance } = await supabase
        .from('recurring_bills_instances')
        .select('*')
        .eq('bill_id', id)
        .eq('month_reference', currentMonthKey)
        .eq('user_id', user.id)
        .single();

      if (existingInstance) {
        // Se existe, apenas atualizar o status pago
        const { error } = await supabase
          .from('recurring_bills_instances')
          .update({ pago: paid })
          .eq('id', existingInstance.id);
        
        if (error) throw error;
      } else {
        // Se não existe, criar nova instância com status pago
        const { error } = await supabase
          .from('recurring_bills_instances')
          .insert({
            bill_id: id,
            month_reference: currentMonthKey,
            pago: paid,
            valor_ajustado: null, // sem valor ajustado inicialmente
            user_id: user.id
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-instances'] });
    },
    onError: (error) => {
      console.error("💥 Erro ao alterar status de pagamento:", error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status de pagamento.",
        variant: "destructive",
      });
    }
  });

  // Função para obter o valor atual da conta (considerando ajustes mensais)
  const getCurrentBillValue = (bill: RecurringBill) => {
    const instance = billInstances.find(inst => inst.bill_id === bill.id);
    if (instance && instance.valor_ajustado !== null) {
      return instance.valor_ajustado;
    }
    
    // Fallback para ajustes antigos
    const adjustment = billAdjustments.find(adj => adj.bill_id === bill.id);
    return adjustment ? adjustment.adjusted_value : bill.value;
  };

  // Função para verificar se a conta está paga no mês selecionado
  const isBillPaidThisMonth = (billId: string) => {
    const instance = billInstances.find(inst => inst.bill_id === billId);
    return instance ? instance.pago : false;
  };

  // Calcular saldos atuais dos bancos
  const calculateCurrentBalances = () => {
    const balances: Record<string, number> = {};
    
    userBanks.forEach(bank => {
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

  // Calcular totais considerando os dados mensais
  const calculateTotals = () => {
    const billsWithMonthlyData = bills.map(bill => ({
      ...bill,
      currentValue: getCurrentBillValue(bill),
      paidThisMonth: isBillPaidThisMonth(bill.id)
    }));

    const totalBills = billsWithMonthlyData.reduce((sum, bill) => sum + bill.currentValue, 0);
    const paidBills = billsWithMonthlyData.filter(bill => bill.paidThisMonth).reduce((sum, bill) => sum + bill.currentValue, 0);
    const unpaidBills = totalBills - paidBills;
    
    const currentBalances = calculateCurrentBalances();
    
    // Considerar apenas C6 BANK e ASAAS para cálculo do saldo restante
    const allowedBanks = ['C6 BANK', 'ASAAS'];
    const totalCash = Object.entries(currentBalances)
      .filter(([bankName]) => allowedBanks.includes(bankName))
      .reduce((sum, [, balance]) => sum + balance, 0);
    
    return {
      totalBills,
      paidBills,
      unpaidBills,
      totalCash,
      remainingCash: totalCash - unpaidBills
    };
  };

  // Função para mapear as contas com dados mensais
  const getBillsWithMonthlyData = () => {
    return bills.map(bill => ({
      ...bill,
      paid_this_month: isBillPaidThisMonth(bill.id),
      current_value: getCurrentBillValue(bill)
    }));
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
    bills: getBillsWithMonthlyData(),
    billAdjustments: [], // Não usado mais, mas mantido para compatibilidade
    bankBalances,
    monthlyItems,
    billInstances,
    userBanks,
    createBillMutation,
    updateBillMutation,
    adjustBillMutation,
    deleteBillMutation,
    togglePaidMutation,
    getCurrentBillValue,
    isBillPaidThisMonth,
    calculateCurrentBalances,
    calculateTotals
  };
};
