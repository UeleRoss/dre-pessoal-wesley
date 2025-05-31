
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PeriodType } from "@/components/PeriodSelector";

interface FinancialItem {
  id: string;
  created_at: string;
  date: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  bank: string;
  source: string | null;
  user_id: string;
}

interface FinancialSummary {
  id: string;
  created_at: string;
  month: string;
  category: string;
  total_value: number;
  user_id: string;
}

interface IncomeSummary {
  id: string;
  created_at: string;
  month: string;
  source: string;
  total_value: number;
  user_id: string;
}

// Função para converter resumo mensal em formato de item para exibição
const summaryToItem = (summary: FinancialSummary): FinancialItem => ({
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
const incomeSummaryToItem = (summary: IncomeSummary): FinancialItem => ({
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
});

export const useFinancialData = (user: any, selectedMonth: Date, periodType: PeriodType) => {
  const [allItems, setAllItems] = useState<FinancialItem[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todos os lançamentos (para seleção completa)
  const { data: allFinancialItems = [] } = useQuery({
    queryKey: ['all-financial-items', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      console.log("Buscando todos os itens financeiros para usuário:", user.id);
      
      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) {
        console.error("Erro ao buscar financial_items:", error);
        throw error;
      }
      
      console.log("Financial items encontrados:", data?.length || 0);
      
      // Buscar resumos de gastos
      const { data: summaries, error: summariesError } = await supabase
        .from('financial_summary')
        .select('*')
        .eq('user_id', user.id)
        .order('month', { ascending: false });
      
      if (summariesError) {
        console.error("Erro ao buscar financial_summary:", summariesError);
        throw summariesError;
      }
      
      console.log("Resumos mensais de gastos encontrados:", summaries?.length || 0);
      
      // Buscar resumos de receitas
      const { data: incomeSummaries, error: incomeSummariesError } = await supabase
        .from('financial_summary_income')
        .select('*')
        .eq('user_id', user.id)
        .order('month', { ascending: false });
      
      if (incomeSummariesError) {
        console.error("Erro ao buscar financial_summary_income:", incomeSummariesError);
        throw incomeSummariesError;
      }
      
      console.log("Resumos de receitas encontrados:", incomeSummaries?.length || 0);
      
      const summaryItems = summaries?.map(summaryToItem) || [];
      const incomeSummaryItems = incomeSummaries?.map(incomeSummaryToItem) || [];
      const combined = [...(data || []), ...summaryItems, ...incomeSummaryItems];
      
      console.log("Total de itens combinados:", combined.length);
      console.log("Resumos de receita convertidos:", incomeSummaryItems);
      
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setAllItems(combined);
      return combined;
    },
    enabled: !!user
  });

  // Buscar lançamentos financeiros baseado no tipo de período
  const { data: financialItems = [], refetch } = useQuery({
    queryKey: ['financial-items', user?.id, periodType, selectedMonth.getMonth(), selectedMonth.getFullYear()],
    queryFn: async () => {
      if (!user) return [];
      
      let startDate: string;
      let endDate: string;
      let monthStr: string;

      if (periodType === 'all') {
        console.log("Buscando todos os dados sem filtro de data para usuário:", user.id);
        
        // Para 'all', buscar todos os dados sem filtro de data
        const { data, error } = await supabase
          .from('financial_items')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });
        
        if (error) {
          console.error("Erro ao buscar todos os financial_items:", error);
          throw error;
        }
        
        console.log("Financial items (todos os dados):", data?.length || 0);
        
        // Buscar todos os resumos de gastos também
        const { data: summaries, error: summariesError } = await supabase
          .from('financial_summary')
          .select('*')
          .eq('user_id', user.id)
          .order('month', { ascending: false });
        
        if (summariesError) {
          console.error("Erro ao buscar todos os financial_summary:", summariesError);
          throw summariesError;
        }
        
        console.log("Resumos de gastos (todos os dados):", summaries?.length || 0);
        
        // Buscar todos os resumos de receitas
        const { data: incomeSummaries, error: incomeSummariesError } = await supabase
          .from('financial_summary_income')
          .select('*')
          .eq('user_id', user.id)
          .order('month', { ascending: false });
        
        if (incomeSummariesError) {
          console.error("Erro ao buscar todos os financial_summary_income:", incomeSummariesError);
          throw incomeSummariesError;
        }
        
        console.log("Resumos de receitas (todos os dados):", incomeSummaries?.length || 0);
        
        const summaryItems = summaries?.map(summaryToItem) || [];
        const incomeSummaryItems = incomeSummaries?.map(incomeSummaryToItem) || [];
        const combined = [...(data || []), ...summaryItems, ...incomeSummaryItems];
        
        combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        console.log("Total de itens (todos os dados):", combined.length);
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('financial_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
      queryClient.invalidateQueries({ queryKey: ['all-financial-items'] });
    }
  });

  const deleteMultipleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      console.log("Tentando deletar IDs:", ids.length, "itens");
      
      if (ids.length === 0) {
        throw new Error("Nenhum item selecionado para deletar");
      }

      const itemsToDelete = allItems.filter(item => ids.includes(item.id));
      const financialItemIds = itemsToDelete.filter(item => item.source !== 'financial_summary' && item.source !== 'financial_summary_income').map(item => item.id);
      const summaryIds = itemsToDelete.filter(item => item.source === 'financial_summary').map(item => item.id);
      const incomeSummaryIds = itemsToDelete.filter(item => item.source === 'financial_summary_income').map(item => item.id);

      let totalDeleted = 0;

      if (financialItemIds.length > 0) {
        const batchSize = 50;
        const batches = [];
        
        for (let i = 0; i < financialItemIds.length; i += batchSize) {
          batches.push(financialItemIds.slice(i, i + batchSize));
        }

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          console.log(`Deletando lote ${i + 1}/${batches.length} de financial_items com ${batch.length} itens`);
          
          const { error, count } = await supabase
            .from('financial_items')
            .delete()
            .in('id', batch);
          
          if (error) {
            console.error(`Erro no lote ${i + 1}:`, error);
            throw error;
          }
          
          totalDeleted += count || 0;
        }
      }

      if (summaryIds.length > 0) {
        console.log(`Deletando ${summaryIds.length} resumos mensais`);
        
        const { error, count } = await supabase
          .from('financial_summary')
          .delete()
          .in('id', summaryIds);
        
        if (error) {
          console.error("Erro ao deletar resumos:", error);
          throw error;
        }
        
        totalDeleted += count || 0;
      }

      if (incomeSummaryIds.length > 0) {
        console.log(`Deletando ${incomeSummaryIds.length} resumos de receitas`);
        
        const { error, count } = await supabase
          .from('financial_summary_income')
          .delete()
          .in('id', incomeSummaryIds);
        
        if (error) {
          console.error("Erro ao deletar resumos de receitas:", error);
          throw error;
        }
        
        totalDeleted += count || 0;
      }
      
      console.log(`Total final deletado: ${totalDeleted}`);
      return { totalDeleted };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
      queryClient.invalidateQueries({ queryKey: ['all-financial-items'] });
      toast({
        title: "Sucesso",
        description: `${data.totalDeleted} lançamentos deletados com sucesso!`,
      });
    },
    onError: (error: any) => {
      console.error("Erro na mutação de deletar múltiplos:", error);
      toast({
        title: "Erro",
        description: "Erro ao deletar lançamentos: " + (error.message || "Erro desconhecido"),
        variant: "destructive",
      });
    }
  });

  return {
    financialItems,
    allItems,
    refetch,
    deleteMutation,
    deleteMultipleMutation
  };
};
