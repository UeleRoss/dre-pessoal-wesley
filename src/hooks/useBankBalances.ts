
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FinancialItem } from "@/types/financial";

export const useBankBalances = (user: any) => {
  // Buscar saldos iniciais dos bancos
  const { data: bankBalances = [] } = useQuery({
    queryKey: ['bank-balances'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('bank_balances')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Buscar todos os bancos únicos que o usuário possui OU que foram configurados
  const { data: availableBanks = [] } = useQuery({
    queryKey: ['available-banks', user?.id, bankBalances],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Buscar bancos dos lançamentos existentes
      const { data: itemsBanks, error } = await supabase
        .from('financial_items')
        .select('bank')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const banksFromItems = [...new Set(itemsBanks.map(item => item.bank))].filter(Boolean);
      const banksFromBalances = bankBalances.map(balance => balance.bank_name);
      
      // Combinar bancos dos lançamentos e bancos configurados
      const allBanks = [...new Set([...banksFromItems, ...banksFromBalances])];
      
      return allBanks;
    },
    enabled: !!user?.id
  });

  return {
    bankBalances,
    availableBanks
  };
};

export const useCalculatedBankBalances = (
  availableBanks: string[],
  bankBalances: any[],
  allItems: FinancialItem[],
  periodItems: FinancialItem[],
  selectedMonth: Date
) => {
  return useMemo(() => {
    console.log("🔄 Recalculando saldos dos bancos mantendo saldo acumulado...");
    
    return availableBanks.map(bank => {
      // Saldo inicial configurado
      const bankConfig = bankBalances.find(b => b.bank_name === bank);
      const initialBalance = bankConfig?.initial_balance || 0;
      
      console.log(`\n=== Calculando saldo acumulado para ${bank} ===`);
      console.log("💰 Saldo inicial configurado:", initialBalance);
      
      // Calcular todos os movimentos manuais até o final do mês ANTERIOR ao selecionado
      const previousMonthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 0);
      
      const previousMovements = allItems
        .filter(item => 
          item.bank === bank && 
          (!item.source || item.source === 'manual') &&
          new Date(item.date) <= previousMonthEnd
        )
        .reduce((sum, item) => {
          const amount = item.type === 'entrada' ? item.amount : -item.amount;
          return sum + amount;
        }, 0);
      
      // Saldo que "sobrou" do período anterior
      const previousBalance = initialBalance + previousMovements;
      
      // Movimentos do período atual
      const currentPeriodMovements = periodItems
        .filter(item => 
          item.bank === bank && 
          (!item.source || item.source === 'manual')
        )
        .reduce((sum, item) => {
          const amount = item.type === 'entrada' ? item.amount : -item.amount;
          return sum + amount;
        }, 0);
      
      // Saldo atual = saldo anterior + movimentos do período atual
      const currentBalance = previousBalance + currentPeriodMovements;
      
      console.log(`✅ Resultado final para ${bank}:`);
      console.log(`   - Saldo inicial: ${initialBalance}`);
      console.log(`   - Movimentos anteriores: ${previousMovements}`);
      console.log(`   - Saldo anterior: ${previousBalance}`);
      console.log(`   - Movimentos do período: ${currentPeriodMovements}`);
      console.log(`   - Saldo atual: ${currentBalance}`);
      
      return {
        name: bank,
        balance: currentBalance,
        previousBalance: previousBalance
      };
    });
  }, [availableBanks, bankBalances, allItems, periodItems, selectedMonth]);
};
