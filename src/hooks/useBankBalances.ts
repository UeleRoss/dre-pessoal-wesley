
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
  periodItems: FinancialItem[]
) => {
  return useMemo(() => {
    console.log("🔄 Recalculando saldos dos bancos...");
    
    return availableBanks.map(bank => {
      // Saldo inicial configurado
      const bankConfig = bankBalances.find(b => b.bank_name === bank);
      const initialBalance = bankConfig?.initial_balance || 0;
      
      console.log(`\n=== Calculando saldo para ${bank} ===`);
      console.log("Saldo inicial configurado:", initialBalance);
      
      // Filtrar TODOS os lançamentos deste banco (excluindo resumos)
      const allBankItems = allItems.filter(item => 
        item.bank === bank && 
        item.source !== 'financial_summary' && 
        item.source !== 'financial_summary_income'
      );
      
      console.log("Total de lançamentos deste banco (todos os períodos):", allBankItems.length);
      
      // Calcular o saldo atual baseado em TODOS os lançamentos
      const totalMovement = allBankItems.reduce((sum, item) => {
        const amount = item.type === 'entrada' ? item.amount : -item.amount;
        return sum + amount;
      }, 0);
      
      console.log("Movimento total de todos os tempos:", totalMovement);
      
      // Saldo atual = saldo inicial + todos os movimentos
      const currentBalance = initialBalance + totalMovement;
      
      console.log("Saldo atual calculado:", currentBalance);
      
      // Para calcular o saldo anterior, precisamos saber qual período estamos vendo
      const periodBankItems = periodItems.filter(item => 
        item.bank === bank && 
        item.source !== 'financial_summary' && 
        item.source !== 'financial_summary_income'
      );
      
      let previousBalance;

      if (periodBankItems.length === 0) {
        // Se não há itens no período atual para este banco, o saldo anterior é igual ao atual
        previousBalance = currentBalance;
        console.log("Nenhum item no período, saldo anterior igual ao saldo atual:", previousBalance);
      } else {
        // Calcular movimento apenas do período atual
        const periodMovement = periodBankItems.reduce((sum, item) => {
          const amount = item.type === 'entrada' ? item.amount : -item.amount;
          return sum + amount;
        }, 0);
        
        console.log("Movimento do período atual:", periodMovement);
        
        // Saldo anterior = saldo atual - movimento do período atual
        previousBalance = currentBalance - periodMovement;
        console.log("Saldo anterior (saldo atual - movimento do período):", previousBalance);
      }
      
      return {
        name: bank,
        balance: currentBalance,
        previousBalance: previousBalance
      };
    });
  }, [availableBanks, bankBalances, allItems, periodItems]);
};
