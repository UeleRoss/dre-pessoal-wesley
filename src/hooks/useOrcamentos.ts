import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

export const useOrcamentos = (user: any, selectedMonth: Date) => {
  const queryClient = useQueryClient();
  const monthKey = format(selectedMonth, 'yyyy-MM');

  // Buscar orçamentos do mês
  const { data: orcamentos = [] } = useQuery({
    queryKey: ['orcamentos', user?.id, monthKey],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('month', monthKey)
        .order('category');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Buscar gastos reais do mês por categoria
  const { data: gastosPorCategoria = {} } = useQuery({
    queryKey: ['gastos-categoria', user?.id, monthKey],
    queryFn: async () => {
      if (!user) return {};

      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('financial_items')
        .select('category, amount')
        .eq('type', 'despesa')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (error) throw error;

      const gastos = (data || []).reduce((acc, item) => {
        const category = item.category || 'Sem categoria';
        acc[category] = (acc[category] || 0) + Number(item.amount);
        return acc;
      }, {} as Record<string, number>);

      return gastos;
    },
    enabled: !!user,
  });

  // Criar orçamento
  const createOrcamentoMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('budgets')
        .insert({
          ...data,
          month: monthKey,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      toast.success('Meta criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar meta: ${error.message}`);
    },
  });

  // Atualizar orçamento
  const updateOrcamentoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('budgets')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      toast.success('Meta atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar meta: ${error.message}`);
    },
  });

  // Deletar orçamento
  const deleteOrcamentoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      toast.success('Meta excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir meta: ${error.message}`);
    },
  });

  return {
    orcamentos,
    gastosPorCategoria,
    createOrcamentoMutation,
    updateOrcamentoMutation,
    deleteOrcamentoMutation,
  };
};
