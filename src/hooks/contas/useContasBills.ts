import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RecurringBill, BillInstance, BillAdjustment } from "./types";

export const useContasBills = (user: any, selectedMonth: Date) => {
  // Formatação do mês para consultas
  const currentMonthKey = selectedMonth.toISOString().slice(0, 10).substring(0, 7) + '-01'; // YYYY-MM-01

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

  // Função para mapear as contas com dados mensais
  const getBillsWithMonthlyData = () => {
    return bills.map(bill => ({
      ...bill,
      paid_this_month: isBillPaidThisMonth(bill.id),
      current_value: getCurrentBillValue(bill)
    }));
  };

  return {
    bills,
    billInstances,
    billAdjustments,
    userBanks,
    currentMonthKey,
    getCurrentBillValue,
    isBillPaidThisMonth,
    getBillsWithMonthlyData
  };
};