import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BillWithMonthlyData } from "./types";
import type { Database } from "@/integrations/supabase/types";

type BankBalanceRow = Database["public"]["Tables"]["bank_balances"]["Row"];

interface BankBalanceUpdate {
  id?: string;
  bankName: string;
  initialBalance: number;
  baselineDate: string;
}

export const useContasCalculations = (
  user: any,
  selectedMonth: Date,
  billsWithMonthlyData: BillWithMonthlyData[],
  userBanks: string[]
) => {
  const queryClient = useQueryClient();

  // Buscar saldos dos bancos
  const { data: bankBalances = [] } = useQuery({
    queryKey: ['bank-balances', user?.id],
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

  const updateBankBalancesMutation = useMutation<void, Error, BankBalanceUpdate[]>({
    mutationFn: async (updates: BankBalanceUpdate[]) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      if (updates.length === 0) return;

      const nowIso = new Date().toISOString();

      for (const update of updates) {
        const payload = {
          initial_balance: update.initialBalance,
          baseline_date: update.baselineDate,
          updated_at: nowIso,
        };

        if (update.id) {
          const { error } = await supabase
            .from('bank_balances')
            .update(payload)
            .eq('id', update.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('bank_balances')
            .insert({
              user_id: user.id,
              bank_name: update.bankName,
              ...payload,
            });

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-balances', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-banks-contas', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-banks-form'] });
    },
  });

  const getBaselineDate = (balance: BankBalanceRow) => {
    if (balance.baseline_date) {
      return balance.baseline_date;
    }
    if (balance.updated_at) {
      return balance.updated_at.split('T')[0] || '1970-01-01';
    }
    return '1970-01-01';
  };

  // Calcular saldos atuais dos bancos
  const calculateCurrentBalances = () => {
    const balances: Record<string, number> = {};
    const today = new Date().toISOString().split('T')[0];

    bankBalances.forEach((balance) => {
      const baselineDate = getBaselineDate(balance);

      const bankMovements = allItems
        .filter(item =>
          item.bank === balance.bank_name &&
          (!item.source || item.source === 'manual') &&
          item.date >= baselineDate &&
          item.date <= today
        )
        .reduce((sum, item) => {
          const normalizedType = (item.type || '').toLowerCase();
          const sanitizedType = normalizedType.normalize
            ? normalizedType.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            : normalizedType;
          const amount = Number(item.amount) || 0;
          const isPositive = sanitizedType === 'entrada' || sanitizedType === 'receita';
          const isNegative = sanitizedType === 'saida' || sanitizedType === 'despesa';

          if (isPositive) {
            return sum + amount;
          }

          if (isNegative) {
            return sum - amount;
          }

          // fallback: treat anything else as outflow when amount is negative
          return sum + amount;
        }, 0);

      balances[balance.bank_name] = Number(balance.initial_balance || 0) + bankMovements;
    });

    return balances;
  };

  // Calcular totais considerando os dados mensais
  const calculateTotals = () => {
    const totalBills = billsWithMonthlyData.reduce((sum, bill) => sum + bill.current_value, 0);
    const paidBills = billsWithMonthlyData.filter(bill => bill.paid_this_month).reduce((sum, bill) => sum + bill.current_value, 0);
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

  return {
    bankBalances,
    monthlyItems,
    calculateCurrentBalances,
    calculateTotals,
    updateBankBalances: updateBankBalancesMutation.mutateAsync,
    isUpdatingBankBalances: updateBankBalancesMutation.isPending
  };
};
