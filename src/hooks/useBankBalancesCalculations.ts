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
    console.log("🔄 Calculando saldos atuais dos bancos...");
    
    return availableBanks.map(bank => {
      // Saldo base configurado
      const bankConfig = bankBalances.find(b => b.bank_name === bank);
      const baseBalance = bankConfig?.initial_balance || 0;
      
      console.log(`\n=== Calculando saldo para ${bank} ===`);
      console.log("💰 Saldo inicial configurado:", baseBalance);
      
      // Calcular todas as movimentações até hoje para obter o saldo atual real
      const today = new Date().toISOString().split('T')[0];
      const allMovements = allItems
        .filter(item => 
          item.bank === bank && 
          (!item.source || item.source === 'manual') &&
          item.date <= today // Todas as movimentações até hoje
        )
        .reduce((sum, item) => {
          const amount = item.type === 'entrada' ? item.amount : -item.amount;
          console.log(`📝 ${item.date} - ${item.type}: ${item.amount} (${amount > 0 ? '+' : ''}${amount})`);
          return sum + amount;
        }, 0);
      
      // Saldo atual = saldo inicial + todas as movimentações até hoje
      const currentBalance = baseBalance + allMovements;
      
      console.log(`✅ Resultado para ${bank}:`);
      console.log(`   - Saldo inicial: ${baseBalance}`);
      console.log(`   - Total de movimentações: ${allMovements}`);
      console.log(`   - Saldo atual: ${currentBalance}`);
      
      return {
        name: bank,
        balance: currentBalance,
        previousBalance: baseBalance
      };
    });
  }, [availableBanks, bankBalances, allItems, selectedMonth]);
};