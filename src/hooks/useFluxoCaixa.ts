import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addMonths, format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export const useFluxoCaixa = (user: any, monthsAhead: number) => {
  // Buscar saldo atual (soma de todos os bancos)
  const { data: currentBalance = 0 } = useQuery({
    queryKey: ['current-balance', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      // Buscar saldo de todos os lançamentos
      const { data: items, error } = await supabase
        .from('financial_items')
        .select('type, amount');

      if (error) throw error;

      const saldo = (items || []).reduce((acc, item) => {
        if (item.type === 'receita') {
          return acc + Number(item.amount);
        } else {
          return acc - Number(item.amount);
        }
      }, 0);

      return saldo;
    },
    enabled: !!user,
  });

  // Buscar contas recorrentes
  const { data: recurringBills = [] } = useQuery({
    queryKey: ['recurring-bills-projection', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('recurring_bills')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Calcular projeção mês a mês
  const projection = [];
  let saldoAcumulado = currentBalance;

  for (let i = 0; i < monthsAhead; i++) {
    const monthDate = addMonths(new Date(), i + 1);
    const monthKey = format(monthDate, 'yyyy-MM');
    const monthName = format(monthDate, "MMMM/yyyy", { locale: ptBR });

    // Calcular despesas das contas recorrentes para este mês
    const despesasContas = recurringBills.reduce((sum, bill) => {
      return sum + Number(bill.amount);
    }, 0);

    // TODO: Buscar lançamentos futuros já cadastrados para este mês
    // TODO: Buscar aportes/retiradas de investimentos programados

    // Por enquanto, vamos considerar apenas as contas recorrentes
    // Em uma implementação completa, você buscaria:
    // - Lançamentos futuros (receitas e despesas já cadastradas)
    // - Investimentos programados
    // - Receitas recorrentes (salário, etc)

    const receitas = 0; // TODO: Implementar busca de receitas previstas
    const despesas = despesasContas;

    const saldoInicial = saldoAcumulado;
    const saldoFinal = saldoInicial + receitas - despesas;

    projection.push({
      month: monthKey,
      monthName,
      saldoInicial,
      receitas,
      despesas,
      saldoFinal,
    });

    saldoAcumulado = saldoFinal;
  }

  return {
    currentBalance,
    projection,
  };
};
