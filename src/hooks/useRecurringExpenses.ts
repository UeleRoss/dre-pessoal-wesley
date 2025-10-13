import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RecurringTemplate, FinancialItem } from "@/types/financial";

export const useRecurringExpenses = (userId: string, month: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query: Buscar templates ativos
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<RecurringTemplate[]>({
    queryKey: ['recurring-templates', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('description');

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  // Query: Buscar contas recorrentes pendentes do mês
  const { data: pendingExpenses = [], isLoading: isLoadingPending } = useQuery<FinancialItem[]>({
    queryKey: ['pending-recurring', userId, month],
    queryFn: async () => {
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;

      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .eq('user_id', userId)
        .eq('is_recurring', true)
        .eq('recurring_status', 'pending')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('description');

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!month
  });

  // Mutation: Gerar contas recorrentes pendentes
  const generateExpenses = useMutation({
    mutationFn: async () => {
      const targetMonth = `${month}-01`;
      const { error } = await supabase.rpc('generate_pending_recurring_expenses', {
        target_user_id: userId,
        target_month: targetMonth
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
      queryClient.invalidateQueries({ queryKey: ['pending-recurring'] });
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
    },
    onError: (error: any) => {
      console.error('Erro ao gerar recorrentes:', error);
      toast({
        title: "Erro ao gerar contas recorrentes",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation: Aprovar conta recorrente
  const approveExpense = useMutation({
    mutationFn: async ({ id, amount }: { id: string, amount?: number }) => {
      const updates: any = { recurring_status: 'approved' };
      if (amount !== undefined) {
        updates.amount = amount;
      }

      const { error } = await supabase
        .from('financial_items')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
      queryClient.invalidateQueries({ queryKey: ['pending-recurring'] });
      toast({
        title: "Conta aprovada",
        description: "A conta foi aprovada e incluída nos cálculos do mês.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao aprovar conta",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation: Pular conta recorrente do mês
  const skipExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_items')
        .update({ recurring_status: 'skipped' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
      queryClient.invalidateQueries({ queryKey: ['pending-recurring'] });
      toast({
        title: "Conta pulada",
        description: "Esta conta não será considerada nos cálculos deste mês.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao pular conta",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation: Desativar template de recorrente
  const deactivateTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('recurring_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-templates'] });
      toast({
        title: "Template desativado",
        description: "Esta conta não será mais gerada automaticamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao desativar template",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    templates,
    pendingExpenses,
    isLoadingTemplates,
    isLoadingPending,
    generateExpenses,
    approveExpense,
    skipExpense,
    deactivateTemplate,
    isGenerating: generateExpenses.isPending,
    isApproving: approveExpense.isPending,
    isSkipping: skipExpense.isPending,
  };
};
