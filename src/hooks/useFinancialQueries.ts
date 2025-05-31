import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PeriodType } from "@/components/PeriodSelector";
import { FinancialItem } from "@/types/financial";
import { summaryToItem, incomeSummaryToItem } from "@/utils/financialDataTransforms";

export const useAllFinancialItems = (user: any) => {
  return useQuery({
    queryKey: ['all-financial-items', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      console.log("🔍 INVESTIGAÇÃO: Buscando TODOS os itens financeiros para usuário:", user.id);
      
      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) {
        console.error("❌ Erro ao buscar financial_items:", error);
        throw error;
      }
      
      console.log("📊 Financial items encontrados:", data?.length || 0, data);
      
      // Buscar resumos de gastos
      const { data: summaries, error: summariesError } = await supabase
        .from('financial_summary')
        .select('*')
        .eq('user_id', user.id)
        .order('month', { ascending: false });
      
      if (summariesError) {
        console.error("❌ Erro ao buscar financial_summary:", summariesError);
        throw summariesError;
      }
      
      console.log("📈 Resumos mensais de gastos encontrados:", summaries?.length || 0, summaries);
      
      // Buscar resumos de receitas - INVESTIGAÇÃO DETALHADA
      console.log("🔍 INVESTIGAÇÃO: Buscando resumos de receitas para user_id:", user.id);
      const { data: incomeSummaries, error: incomeSummariesError } = await supabase
        .from('financial_summary_income')
        .select('*')
        .eq('user_id', user.id)
        .order('month', { ascending: false });
      
      if (incomeSummariesError) {
        console.error("❌ Erro ao buscar financial_summary_income:", incomeSummariesError);
        console.error("❌ Detalhes do erro:", incomeSummariesError.message, incomeSummariesError.details);
        throw incomeSummariesError;
      }
      
      console.log("💰 RECEITAS ENCONTRADAS:", incomeSummaries?.length || 0);
      console.log("💰 DADOS DAS RECEITAS:", incomeSummaries);
      
      // Verificar se o user_id está correto nos dados
      if (incomeSummaries && incomeSummaries.length > 0) {
        console.log("✅ Primeira receita encontrada:", incomeSummaries[0]);
        console.log("✅ User ID da receita:", incomeSummaries[0].user_id);
        console.log("✅ User ID atual:", user.id);
        console.log("✅ IDs são iguais?", incomeSummaries[0].user_id === user.id);
      }
      
      const summaryItems = summaries?.map(summaryToItem) || [];
      const incomeSummaryItems = incomeSummaries?.map(incomeSummaryToItem) || [];
      
      console.log("🔄 Resumos de gastos convertidos:", summaryItems.length);
      console.log("🔄 Resumos de receitas convertidos:", incomeSummaryItems.length);
      console.log("🔄 Dados de receitas convertidos:", incomeSummaryItems);
      
      const combined = [...(data || []), ...summaryItems, ...incomeSummaryItems];
      
      console.log("📊 Total de itens combinados:", combined.length);
      console.log("📊 Tipos de items:", {
        financial_items: data?.length || 0,
        expense_summaries: summaryItems.length,
        income_summaries: incomeSummaryItems.length
      });
      
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      return combined;
    },
    enabled: !!user
  });
};

export const useFinancialItemsByPeriod = (user: any, selectedMonth: Date, periodType: PeriodType) => {
  return useQuery({
    queryKey: ['financial-items', user?.id, periodType, selectedMonth.getMonth(), selectedMonth.getFullYear()],
    queryFn: async () => {
      if (!user) return [];
      
      let startDate: string;
      let endDate: string;
      let monthStr: string;

      if (periodType === 'all') {
        console.log("🔍 INVESTIGAÇÃO: Buscando TODOS os dados sem filtro de data");
        
        // Para 'all', buscar todos os dados sem filtro de data
        const { data, error } = await supabase
          .from('financial_items')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });
        
        if (error) {
          console.error("❌ Erro ao buscar todos os financial_items:", error);
          throw error;
        }
        
        console.log("📊 Financial items (todos os dados):", data?.length || 0);
        
        // Buscar todos os resumos de gastos também
        const { data: summaries, error: summariesError } = await supabase
          .from('financial_summary')
          .select('*')
          .eq('user_id', user.id)
          .order('month', { ascending: false });
        
        if (summariesError) {
          console.error("❌ Erro ao buscar todos os financial_summary:", summariesError);
          throw summariesError;
        }
        
        console.log("📈 Resumos de gastos (todos os dados):", summaries?.length || 0);
        
        // Buscar todos os resumos de receitas - INVESTIGAÇÃO EXTRA
        console.log("🔍 INVESTIGAÇÃO EXTRA: Buscando TODAS as receitas");
        const { data: incomeSummaries, error: incomeSummariesError } = await supabase
          .from('financial_summary_income')
          .select('*')
          .eq('user_id', user.id)
          .order('month', { ascending: false });
        
        if (incomeSummariesError) {
          console.error("❌ Erro ao buscar todas as receitas:", incomeSummariesError);
          throw incomeSummariesError;
        }
        
        console.log("💰 TODAS AS RECEITAS:", incomeSummaries?.length || 0);
        console.log("💰 DADOS COMPLETOS DAS RECEITAS:", incomeSummaries);
        
        const summaryItems = summaries?.map(summaryToItem) || [];
        const incomeSummaryItems = incomeSummaries?.map(incomeSummaryToItem) || [];
        
        console.log("🔄 Conversão - Receitas processadas:", incomeSummaryItems);
        
        const combined = [...(data || []), ...summaryItems, ...incomeSummaryItems];
        
        combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        console.log("📊 Total FINAL (modo ALL):", combined.length);
        console.log("📊 Itens com type 'entrada':", combined.filter(item => item.type === 'entrada').length);
        
        return combined;
      }
      
      if (periodType === 'year') {
        startDate = new Date(selectedMonth.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = new Date(selectedMonth.getFullYear(), 11, 31).toISOString().split('T')[0];
        console.log(`Buscando dados do ano ${selectedMonth.getFullYear()} para usuário: ${user.id}`);
      } else {
        startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).toISOString().split('T')[0];
        console.log(`Buscando dados do mês ${selectedMonth.getMonth() + 1}/${selectedMonth.getFullYear()} para usuário: ${user.id}`);
      }
      
      console.log("Período:", startDate, "até", endDate);
      
      // Buscar lançamentos detalhados
      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
      
      if (error) {
        console.error("Erro ao buscar financial_items do período:", error);
        throw error;
      }
      
      console.log("Financial items do período encontrados:", data?.length || 0);
      
      // Para resumos, buscar baseado no período
      if (periodType === 'year') {
        // Para ano, buscar todos os meses do ano
        const { data: summaries, error: summariesError } = await supabase
          .from('financial_summary')
          .select('*')
          .eq('user_id', user.id)
          .gte('month', `${selectedMonth.getFullYear()}-01-01`)
          .lte('month', `${selectedMonth.getFullYear()}-12-01`);
        
        if (summariesError) {
          console.error("Erro ao buscar financial_summary do ano:", summariesError);
          throw summariesError;
        }
        
        console.log("Resumos de gastos do ano:", summaries?.length || 0);
        
        const { data: incomeSummaries, error: incomeSummariesError } = await supabase
          .from('financial_summary_income')
          .select('*')
          .eq('user_id', user.id)
          .gte('month', `${selectedMonth.getFullYear()}-01-01`)
          .lte('month', `${selectedMonth.getFullYear()}-12-01`);
        
        if (incomeSummariesError) {
          console.error("Erro ao buscar financial_summary_income do ano:", incomeSummariesError);
          throw incomeSummariesError;
        }
        
        console.log("Resumos de receitas do ano:", incomeSummaries?.length || 0);
        
        const summaryItems = summaries?.map(summaryToItem) || [];
        const incomeSummaryItems = incomeSummaries?.map(incomeSummaryToItem) || [];
        const combined = [...(data || []), ...summaryItems, ...incomeSummaryItems];
        
        combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        console.log("Total de itens do ano combinados:", combined.length);
        return combined;
      } else {
        // Para mês, manter lógica existente
        monthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-01`;
        console.log("Buscando resumos para o mês:", monthStr);
        
        const { data: summaries, error: summariesError } = await supabase
          .from('financial_summary')
          .select('*')
          .eq('user_id', user.id)
          .eq('month', monthStr);
        
        if (summariesError) {
          console.error("Erro ao buscar financial_summary do mês:", summariesError);
          throw summariesError;
        }
        
        console.log("Resumos de gastos do mês:", summaries?.length || 0);
        
        const { data: incomeSummaries, error: incomeSummariesError } = await supabase
          .from('financial_summary_income')
          .select('*')
          .eq('user_id', user.id)
          .eq('month', monthStr);
        
        if (incomeSummariesError) {
          console.error("Erro ao buscar financial_summary_income do mês:", incomeSummariesError);
          throw incomeSummariesError;
        }
        
        console.log("Resumos de receitas do mês:", incomeSummaries?.length || 0);
        
        const summaryItems = summaries?.map(summaryToItem) || [];
        const incomeSummaryItems = incomeSummaries?.map(incomeSummaryToItem) || [];
        const combined = [...(data || []), ...summaryItems, ...incomeSummaryItems];
        
        combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        console.log("Total de itens do mês combinados:", combined.length);
        return combined;
      }
    },
    enabled: !!user
  });
};
