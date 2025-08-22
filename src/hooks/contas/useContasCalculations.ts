import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BillWithMonthlyData } from "./types";

export const useContasCalculations = (
  user: any,
  selectedMonth: Date,
  billsWithMonthlyData: BillWithMonthlyData[],
  userBanks: string[]
) => {
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
    queryKey: ['monthly-items-contas', user?.id, selectedMonth.toISOString().slice(0, 7)],
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

  // Buscar todos os lançamentos do usuário (para saldo real independente do mês)
  const { data: allItems = [] } = useQuery({
    queryKey: ['all-items-contas', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Calcular saldos atuais dos bancos
  const calculateCurrentBalances = () => {
    const balances: Record<string, number> = {};
    
    userBanks.forEach(bank => {
      const bankConfig = bankBalances.find(b => b.bank_name === bank);
      const initialBalance = bankConfig?.initial_balance || 0;
      const baselineDate = bankConfig?.updated_at
        ? new Date(bankConfig.updated_at).toISOString().split('T')[0]
        : '1970-01-01';
      const today = new Date().toISOString().split('T')[0];
      
      const bankMovements = allItems
        .filter(item => 
          item.bank === bank &&
          (!item.source || item.source === 'manual') &&
          item.date > baselineDate &&
          item.date <= today
        )
        .reduce((sum, item) => {
          const amount = item.type === 'entrada' ? Number(item.amount) : -Number(item.amount);
          return sum + amount;
        }, 0);
      
      balances[bank] = Number(initialBalance) + bankMovements;
    });
    
    return balances;
  };

  // Calcular totais considerando os dados mensais
  const calculateTotals = () => {
    const totalBills = billsWithMonthlyData.reduce((sum, bill) => sum + bill.current_value, 0);
    const paidBills = billsWithMonthlyData.filter(bill => bill.paid_this_month).reduce((sum, bill) => sum + bill.current_value, 0);
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

  return {
    bankBalances,
    monthlyItems,
    calculateCurrentBalances,
    calculateTotals
  };
};