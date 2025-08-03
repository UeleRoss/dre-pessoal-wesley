import { useMemo } from "react";
import { FinancialItem } from "@/types/financial";

export const useBankBalancesCalculations = (
  availableBanks: string[],
  bankBalances: any[],
  allItems: FinancialItem[],
  periodItems: FinancialItem[],
  selectedMonth: Date
) => {
  return useMemo(() => {
    console.log("🔄 Calculando saldos dos bancos com movimentos do período...");
    
    return availableBanks.map(bank => {
      // Saldo base configurado (valor real do início do período)
      const bankConfig = bankBalances.find(b => b.bank_name === bank);
      const baseBalance = bankConfig?.initial_balance || 0;
      
      console.log(`\n=== Calculando saldo para ${bank} ===`);
      console.log("💰 Saldo base configurado:", baseBalance);
      
      // Movimentos do período atual para calcular o saldo atual
      // Apenas considerar movimentos a partir de hoje
      const today = new Date().toISOString().split('T')[0];
      const currentPeriodMovements = periodItems
        .filter(item => 
          item.bank === bank && 
          (!item.source || item.source === 'manual') &&
          item.date >= today // Só movimentos de hoje em diante
        )
        .reduce((sum, item) => {
          const amount = item.type === 'entrada' ? item.amount : -item.amount;
          console.log(`📝 ${item.date} - ${item.type}: ${item.amount} (${amount > 0 ? '+' : ''}${amount})`);
          return sum + amount;
        }, 0);
      
      // Saldo atual = saldo base + movimentos do período
      const currentBalance = baseBalance + currentPeriodMovements;
      
      console.log(`✅ Resultado para ${bank}:`);
      console.log(`   - Saldo base: ${baseBalance}`);
      console.log(`   - Movimentos do período: ${currentPeriodMovements}`);
      console.log(`   - Saldo atual: ${currentBalance}`);
      
      return {
        name: bank,
        balance: currentBalance,
        previousBalance: baseBalance
      };
    });
  }, [availableBanks, bankBalances, allItems, periodItems, selectedMonth]);
};