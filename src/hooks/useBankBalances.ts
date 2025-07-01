
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
    console.log("🔄 Recalculando saldos dos bancos para o período atual...");
    console.log("📊 Total de itens do período:", periodItems.length);
    
    return availableBanks.map(bank => {
      // Saldo inicial configurado
      const bankConfig = bankBalances.find(b => b.bank_name === bank);
      const initialBalance = bankConfig?.initial_balance || 0;
      
      console.log(`\n=== Calculando saldo para ${bank} ===`);
      console.log("💰 Saldo inicial configurado:", initialBalance);
      
      // *** INVESTIGAÇÃO ESPECIAL PARA C6 BANK ***
      if (bank === 'C6 BANK') {
        console.log("🔍 INVESTIGAÇÃO ESPECIAL: C6 BANK");
        console.log("📋 Todos os itens do período:", periodItems.length);
        
        // Mostrar TODOS os itens do C6 Bank no período
        const allC6Items = periodItems.filter(item => item.bank === 'C6 BANK');
        console.log("💳 Total de lançamentos C6 Bank no período:", allC6Items.length);
        
        allC6Items.forEach((item, index) => {
          console.log(`📝 C6 Item ${index + 1}:`, {
            date: item.date,
            type: item.type,
            amount: item.amount,
            description: item.description,
            source: item.source,
            id: item.id
          });
        });
        
        // Separar por origem
        const manualItems = allC6Items.filter(item => !item.source || item.source === 'manual');
        const summaryItems = allC6Items.filter(item => 
          item.source === 'financial_summary' || 
          item.source === 'financial_summary_income'
        );
        
        console.log("🖊️ Lançamentos manuais C6:", manualItems.length);
        console.log("📊 Lançamentos de resumo C6:", summaryItems.length);
        
        // Calcular valores separadamente
        const manualMovement = manualItems.reduce((sum, item) => {
          const amount = item.type === 'entrada' ? item.amount : -item.amount;
          return sum + amount;
        }, 0);
        
        const summaryMovement = summaryItems.reduce((sum, item) => {
          const amount = item.type === 'entrada' ? item.amount : -item.amount;
          return sum + amount;
        }, 0);
        
        console.log("🖊️ Movimento manual C6:", manualMovement);
        console.log("📊 Movimento resumo C6:", summaryMovement);
        console.log("📊 Movimento total C6:", manualMovement + summaryMovement);
      }
      
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
      
      console.log("📊 Movimento total do período:", periodMovement);
      
      // Para o período atual:
      // - Saldo anterior = saldo inicial (sem movimentos do período)
      // - Saldo atual = saldo inicial + movimentos do período
      const previousBalance = initialBalance;
      const currentBalance = initialBalance + periodMovement;
      
      console.log(`✅ Resultado final para ${bank}:`);
      console.log(`   - Saldo anterior (inicial): ${previousBalance}`);
      console.log(`   - Saldo atual (inicial + movimentos): ${currentBalance}`);
      console.log(`   - Variação do período: ${periodMovement}`);
      
      return {
        name: bank,
        balance: currentBalance,
        previousBalance: previousBalance
      };
    });
  }, [availableBanks, bankBalances, allItems, periodItems]);
};
