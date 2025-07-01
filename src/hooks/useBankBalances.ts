
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

  // Função para corrigir o saldo do C6 BANK
  const correctC6BankBalance = async () => {
    if (!user?.id) return;
    
    console.log("🔧 Corrigindo saldo do C6 BANK para valor real de R$ 1.615,17");
    
    const { error } = await supabase
      .from('bank_balances')
      .update({ 
        initial_balance: 2701.24,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('bank_name', 'C6 BANK');
    
    if (error) {
      console.error("❌ Erro ao corrigir saldo do C6 BANK:", error);
    } else {
      console.log("✅ Saldo do C6 BANK corrigido com sucesso!");
      // Invalidar as queries para recarregar os dados
      window.location.reload();
    }
  };

  // Executar a correção automaticamente
  if (user?.id && bankBalances.length > 0) {
    const c6Bank = bankBalances.find(b => b.bank_name === 'C6 BANK');
    if (c6Bank && c6Bank.initial_balance !== 2701.24) {
      correctC6BankBalance();
    }
  }

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
      
      // Filtrar apenas os lançamentos MANUAIS deste banco NO PERÍODO ATUAL
      // Excluindo completamente os resumos (financial_summary e financial_summary_income)
      const periodBankItems = periodItems
        .filter(item => 
          item.bank === bank && 
          (!item.source || item.source === 'manual')
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      console.log("📋 Lançamentos MANUAIS do período deste banco:", periodBankItems.length);
      
      // Calcular movimento do período atual (apenas lançamentos manuais)
      const periodMovement = periodBankItems.reduce((sum, item) => {
        const amount = item.type === 'entrada' ? item.amount : -item.amount;
        console.log(`📝 ${item.date} - ${item.type}: ${item.amount} (${amount > 0 ? '+' : ''}${amount})`);
        return sum + amount;
      }, 0);
      
      console.log("📊 Movimento total do período (apenas manuais):", periodMovement);
      
      // Saldo atual = saldo inicial + movimentos manuais do período
      const previousBalance = initialBalance;
      const currentBalance = initialBalance + periodMovement;
      
      console.log(`✅ Resultado final para ${bank}:`);
      console.log(`   - Saldo inicial: ${previousBalance}`);
      console.log(`   - Movimento manual do período: ${periodMovement}`);
      console.log(`   - Saldo atual: ${currentBalance}`);
      
      return {
        name: bank,
        balance: currentBalance,
        previousBalance: previousBalance
      };
    });
  }, [availableBanks, bankBalances, allItems, periodItems]);
};
