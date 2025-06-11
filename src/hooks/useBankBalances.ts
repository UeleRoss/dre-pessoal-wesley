
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
    console.log("📊 Total de itens do período:", periodItems.length);
    console.log("📊 Total de itens históricos:", allItems.length);
    
    return availableBanks.map(bank => {
      // Saldo inicial configurado
      const bankConfig = bankBalances.find(b => b.bank_name === bank);
      const initialBalance = bankConfig?.initial_balance || 0;
      
      console.log(`\n=== Calculando saldo para ${bank} ===`);
      console.log("💰 Saldo inicial configurado:", initialBalance);
      
      // Filtrar TODOS os lançamentos históricos deste banco (excluindo resumos)
      const allBankItems = allItems
        .filter(item => 
          item.bank === bank && 
          item.source !== 'financial_summary' && 
          item.source !== 'financial_summary_income'
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      console.log("📋 Total de lançamentos históricos deste banco:", allBankItems.length);
      
      // Calcular movimento histórico total (todos os lançamentos)
      const totalHistoricalMovement = allBankItems.reduce((sum, item) => {
        const amount = item.type === 'entrada' ? item.amount : -item.amount;
        return sum + amount;
      }, 0);
      
      console.log("📊 Movimento histórico total:", totalHistoricalMovement);
      
      // Filtrar apenas os lançamentos deste banco NO PERÍODO ATUAL (excluindo resumos)
      const periodBankItems = periodItems
        .filter(item => 
          item.bank === bank && 
          item.source !== 'financial_summary' && 
          item.source !== 'financial_summary_income'
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      console.log("📋 Lançamentos do período atual deste banco:", periodBankItems.length);
      
      // Calcular movimento do período atual
      const periodMovement = periodBankItems.reduce((sum, item) => {
        const amount = item.type === 'entrada' ? item.amount : -item.amount;
        console.log(`📝 ${item.date} - ${item.type}: ${item.amount} (${amount > 0 ? '+' : ''}${amount})`);
        return sum + amount;
      }, 0);
      
      console.log("📊 Movimento do período:", periodMovement);
      
      // SALDO ATUAL = saldo inicial + TODOS os movimentos históricos
      const currentBalance = initialBalance + totalHistoricalMovement;
      
      // SALDO ANTERIOR = saldo atual - movimentos do período atual
      const previousBalance = currentBalance - periodMovement;
      
      console.log(`✅ Resultado final para ${bank}:`);
      console.log(`   - Saldo inicial: ${initialBalance}`);
      console.log(`   - Movimento histórico total: ${totalHistoricalMovement}`);
      console.log(`   - Saldo atual (inicial + histórico): ${currentBalance}`);
      console.log(`   - Movimento do período: ${periodMovement}`);
      console.log(`   - Saldo anterior (atual - período): ${previousBalance}`);
      
      return {
        name: bank,
        balance: currentBalance,
        previousBalance: previousBalance
      };
    });
  }, [availableBanks, bankBalances, allItems, periodItems]);
};
