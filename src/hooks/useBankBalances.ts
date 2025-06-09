
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
    console.log("📊 Total de itens disponíveis:", allItems.length);
    console.log("📅 Itens do período atual:", periodItems.length);
    
    return availableBanks.map(bank => {
      // Saldo inicial configurado
      const bankConfig = bankBalances.find(b => b.bank_name === bank);
      const initialBalance = bankConfig?.initial_balance || 0;
      
      console.log(`\n=== Calculando saldo para ${bank} ===`);
      console.log("💰 Saldo inicial configurado:", initialBalance);
      
      // Filtrar TODOS os lançamentos deste banco (excluindo resumos) até hoje
      const allBankItems = allItems
        .filter(item => 
          item.bank === bank && 
          item.source !== 'financial_summary' && 
          item.source !== 'financial_summary_income'
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Ordenar por data crescente
      
      console.log("📋 Lançamentos históricos deste banco:", allBankItems.length);
      if (allBankItems.length > 0) {
        console.log("📅 Data mais antiga:", allBankItems[0].date);
        console.log("📅 Data mais recente:", allBankItems[allBankItems.length - 1].date);
      }
      
      // Calcular o saldo atual baseado em TODOS os movimentos históricos
      const totalHistoricalMovement = allBankItems.reduce((sum, item) => {
        const amount = item.type === 'entrada' ? item.amount : -item.amount;
        console.log(`📝 ${item.date} - ${item.type}: ${item.amount} (${amount > 0 ? '+' : ''}${amount})`);
        return sum + amount;
      }, 0);
      
      console.log("📈 Total de movimentos históricos:", totalHistoricalMovement);
      
      // Saldo atual = saldo inicial + todos os movimentos históricos
      const currentBalance = initialBalance + totalHistoricalMovement;
      
      console.log("💵 Saldo atual calculado:", currentBalance);
      
      // Para calcular o saldo anterior (início do período), precisamos subtrair apenas os movimentos do período atual
      const periodBankItems = periodItems
        .filter(item => 
          item.bank === bank && 
          item.source !== 'financial_summary' && 
          item.source !== 'financial_summary_income'
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      console.log("📋 Lançamentos do período atual:", periodBankItems.length);
      
      let previousBalance;
      
      if (periodBankItems.length === 0) {
        // Se não há movimentos no período atual, o saldo anterior é igual ao atual
        previousBalance = currentBalance;
        console.log("🔄 Nenhum movimento no período, saldo anterior = saldo atual");
      } else {
        // Calcular movimento apenas do período atual
        const periodMovement = periodBankItems.reduce((sum, item) => {
          const amount = item.type === 'entrada' ? item.amount : -item.amount;
          console.log(`📝 Período ${item.date} - ${item.type}: ${item.amount} (${amount > 0 ? '+' : ''}${amount})`);
          return sum + amount;
        }, 0);
        
        console.log("📊 Movimento total do período:", periodMovement);
        
        // Saldo anterior = saldo atual - movimento do período atual
        previousBalance = currentBalance - periodMovement;
        console.log("⏮️ Saldo anterior (início do período):", previousBalance);
      }
      
      console.log(`✅ Resultado final para ${bank}:`);
      console.log(`   - Saldo anterior: ${previousBalance}`);
      console.log(`   - Saldo atual: ${currentBalance}`);
      console.log(`   - Variação: ${currentBalance - previousBalance}`);
      
      return {
        name: bank,
        balance: currentBalance,
        previousBalance: previousBalance
      };
    });
  }, [availableBanks, bankBalances, allItems, periodItems]);
};
