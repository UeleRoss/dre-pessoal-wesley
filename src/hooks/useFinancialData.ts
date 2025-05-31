
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

export const useFinancialData = (user: any, selectedMonth: Date) => {
  const [allItems, setAllItems] = useState<FinancialItem[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todos os lançamentos (para seleção completa)
  const { data: allFinancialItems = [] } = useQuery({
    queryKey: ['all-financial-items'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Também buscar resumos mensais de gastos
      const { data: summaries, error: summariesError } = await supabase
        .from('financial_summary')
        .select('*')
        .order('month', { ascending: false });
      
      if (summariesError) throw summariesError;
      
      // Buscar resumos mensais de receitas
      const { data: incomeSummaries, error: incomeSummariesError } = await supabase
        .from('financial_summary_income')
        .select('*')
        .order('month', { ascending: false });
      
      if (incomeSummariesError) throw incomeSummariesError;
      
      // Converter resumos para formato de item e combinar
      const summaryItems = summaries?.map(summaryToItem) || [];
      const incomeSummaryItems = incomeSummaries?.map(incomeSummaryToItem) || [];
      const combined = [...(data || []), ...summaryItems, ...incomeSummaryItems];
      
      // Ordenar por data
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setAllItems(combined);
      return combined;
    },
    enabled: !!user
  });

  // Buscar lançamentos financeiros do mês selecionado
  const { data: financialItems = [], refetch } = useQuery({
    queryKey: ['financial-items', selectedMonth.getMonth(), selectedMonth.getFullYear()],
    queryFn: async () => {
      if (!user) return [];
      
      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
      
      // Buscar lançamentos detalhados
      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Buscar resumos mensais do mesmo período
      const monthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-01`;
      const { data: summaries, error: summariesError } = await supabase
        .from('financial_summary')
        .select('*')
        .eq('month', monthStr);
      
      if (summariesError) throw summariesError;
      
      // Buscar resumos de receitas do mesmo período
      const { data: incomeSummaries, error: incomeSummariesError } = await supabase
        .from('financial_summary_income')
        .select('*')
        .eq('month', monthStr);
      
      if (incomeSummariesError) throw incomeSummariesError;
      
      // Converter resumos para formato de item e combinar
      const summaryItems = summaries?.map(summaryToItem) || [];
      const incomeSummaryItems = incomeSummaries?.map(incomeSummaryToItem) || [];
      const combined = [...(data || []), ...summaryItems, ...incomeSummaryItems];
      
      // Ordenar por data
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      return combined;
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

      // Separar IDs de financial_items dos de financial_summary e financial_summary_income
      const itemsToDelete = allItems.filter(item => ids.includes(item.id));
      const financialItemIds = itemsToDelete.filter(item => item.source !== 'financial_summary' && item.source !== 'financial_summary_income').map(item => item.id);
      const summaryIds = itemsToDelete.filter(item => item.source === 'financial_summary').map(item => item.id);
      const incomeSummaryIds = itemsToDelete.filter(item => item.source === 'financial_summary_income').map(item => item.id);

      let totalDeleted = 0;

      // Deletar financial_items
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

      // Deletar financial_summary
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

      // Deletar financial_summary_income
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
