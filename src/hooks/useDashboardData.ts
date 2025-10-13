import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const useDashboardData = (user: any, period: '3months' | '6months' | '12months' | 'year') => {
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '3months':
        startDate = subMonths(now, 3);
        break;
      case '6months':
        startDate = subMonths(now, 6);
        break;
      case '12months':
        startDate = subMonths(now, 12);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = subMonths(now, 6);
    }

    return { startDate, endDate: now };
  };

  const { data: financialItems = [] } = useQuery({
    queryKey: ['dashboard-financial-items', user?.id, period],
    queryFn: async () => {
      if (!user) return [];

      const { startDate, endDate } = getDateRange();

      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Cálculos gerais
  const totalReceitas = financialItems
    .filter(item => item.type === 'receita')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalDespesas = financialItems
    .filter(item => item.type === 'despesa')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const saldoPeriodo = totalReceitas - totalDespesas;

  // Calcular número de meses no período
  const { startDate, endDate } = getDateRange();
  const monthsDiff = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));

  const mediaMensal = totalReceitas / monthsDiff;
  const economiaMedia = saldoPeriodo / monthsDiff;

  // Maior despesa por categoria
  const despesasPorCategoria = financialItems
    .filter(item => item.type === 'despesa')
    .reduce((acc, item) => {
      const category = item.category || 'Sem categoria';
      acc[category] = (acc[category] || 0) + Number(item.amount);
      return acc;
    }, {} as Record<string, number>);

  const maiorDespesa = Object.entries(despesasPorCategoria).length > 0
    ? Object.entries(despesasPorCategoria).reduce((max, [category, amount]) =>
        amount > max.amount ? { category, amount } : max
      , { category: '', amount: 0 })
    : null;

  // Maior receita por fonte
  const receitasPorFonte = financialItems
    .filter(item => item.type === 'receita')
    .reduce((acc, item) => {
      const source = item.source || 'Sem fonte';
      acc[source] = (acc[source] || 0) + Number(item.amount);
      return acc;
    }, {} as Record<string, number>);

  const maiorReceita = Object.entries(receitasPorFonte).length > 0
    ? Object.entries(receitasPorFonte).reduce((max, [source, amount]) =>
        amount > max.amount ? { source, amount } : max
      , { source: '', amount: 0 })
    : null;

  // Tendências mensais
  const monthlyData = financialItems.reduce((acc, item) => {
    const monthKey = format(new Date(item.date), 'yyyy-MM');
    if (!acc[monthKey]) {
      acc[monthKey] = { receitas: 0, despesas: 0 };
    }
    if (item.type === 'receita') {
      acc[monthKey].receitas += Number(item.amount);
    } else {
      acc[monthKey].despesas += Number(item.amount);
    }
    return acc;
  }, {} as Record<string, { receitas: number; despesas: number }>);

  const monthlyTrends = Object.entries(monthlyData)
    .map(([month, data]) => ({
      month: format(new Date(month + '-01'), 'MMM/yy', { locale: ptBR }),
      receitas: data.receitas,
      despesas: data.despesas,
      saldo: data.receitas - data.despesas,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Breakdown por categoria
  const categoryBreakdown = Object.entries(despesasPorCategoria)
    .map(([name, value]) => ({
      name,
      value,
      percentage: (value / totalDespesas) * 100,
    }))
    .sort((a, b) => b.value - a.value);

  // Distribuição por banco
  const bankData = financialItems.reduce((acc, item) => {
    const bank = item.bank || 'Sem banco';
    acc[bank] = (acc[bank] || 0) + Number(item.amount);
    return acc;
  }, {} as Record<string, number>);

  const totalBankAmount = Object.values(bankData).reduce((sum, val) => sum + val, 0);

  const bankDistribution = Object.entries(bankData)
    .map(([name, value]) => ({
      name,
      value,
      percentage: (value / totalBankAmount) * 100,
    }))
    .sort((a, b) => b.value - a.value);

  // Análise de tendências por categoria (comparando último mês com penúltimo)
  const currentMonth = format(new Date(), 'yyyy-MM');
  const previousMonth = format(subMonths(new Date(), 1), 'yyyy-MM');

  const getCategoryAmountForMonth = (month: string) => {
    return financialItems
      .filter(item => item.type === 'despesa' && format(new Date(item.date), 'yyyy-MM') === month)
      .reduce((acc, item) => {
        const category = item.category || 'Sem categoria';
        acc[category] = (acc[category] || 0) + Number(item.amount);
        return acc;
      }, {} as Record<string, number>);
  };

  const currentMonthCategories = getCategoryAmountForMonth(currentMonth);
  const previousMonthCategories = getCategoryAmountForMonth(previousMonth);

  const allCategories = new Set([
    ...Object.keys(currentMonthCategories),
    ...Object.keys(previousMonthCategories),
  ]);

  const categoryTrends = Array.from(allCategories)
    .map(category => {
      const currentAmount = currentMonthCategories[category] || 0;
      const previousAmount = previousMonthCategories[category] || 0;
      const diff = currentAmount - previousAmount;
      const percentage = previousAmount > 0 ? (diff / previousAmount) * 100 : 0;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (Math.abs(percentage) > 5) {
        trend = diff > 0 ? 'up' : 'down';
      }

      return {
        category,
        currentMonth: currentAmount,
        previousMonth: previousAmount,
        trend,
        percentage,
      };
    })
    .filter(item => item.currentMonth > 0 || item.previousMonth > 0)
    .sort((a, b) => b.currentMonth - a.currentMonth)
    .slice(0, 10);

  return {
    totalReceitas,
    totalDespesas,
    saldoPeriodo,
    mediaMensal,
    economiaMedia,
    maiorDespesa,
    maiorReceita,
    monthlyTrends,
    categoryBreakdown,
    bankDistribution,
    categoryTrends,
  };
};
