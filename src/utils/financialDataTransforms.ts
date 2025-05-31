
import { FinancialItem, FinancialSummary, IncomeSummary } from "@/types/financial";

// Função para converter resumo mensal em formato de item para exibição
export const summaryToItem = (summary: FinancialSummary): FinancialItem => ({
  id: summary.id,
  created_at: summary.created_at,
  date: summary.month,
  type: 'saida', // Resumos são sempre saídas (gastos)
  amount: summary.total_value,
  description: `Resumo mensal - ${summary.category}`,
  category: summary.category,
  bank: 'RESUMO MENSAL',
  source: 'financial_summary',
  user_id: summary.user_id
});

// Função para converter resumo de receitas em formato de item para exibição
export const incomeSummaryToItem = (summary: IncomeSummary): FinancialItem => {
  console.log("🔄 Convertendo receita:", summary);
  
  const converted = {
    id: summary.id,
    created_at: summary.created_at,
    date: summary.month,
    type: 'entrada', // Resumos de receita são entradas
    amount: summary.total_value,
    description: `Receita mensal - ${summary.source}`,
    category: summary.source,
    bank: 'RECEITA MENSAL',
    source: 'financial_summary_income',
    user_id: summary.user_id
  };
  
  console.log("✅ Receita convertida:", converted);
  return converted;
};
