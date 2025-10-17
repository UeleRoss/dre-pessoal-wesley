import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import type { BusinessUnit } from "@/types/business-unit";

interface BudgetRow {
  id: string;
  category: string;
  limit_amount: number;
  month: string;
  alert_threshold?: number | null;
}

interface CreateBudgetPayload {
  business_unit_id: string;
  limit_amount: number;
  alert_threshold: number;
}

interface UpdateBudgetPayload {
  id: string;
  data: {
    business_unit_id?: string;
    limit_amount?: number;
    alert_threshold?: number;
  };
}

export const useOrcamentos = (user: any, selectedMonth: Date) => {
  const queryClient = useQueryClient();
  const monthKey = format(selectedMonth, 'yyyy-MM');

  // Buscar unidades de negócio do usuário
  const { data: businessUnits = [] } = useQuery<BusinessUnit[]>({
    queryKey: ['business-units', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_units')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const unitMap = useMemo(() => {
    return new Map(businessUnits.map((unit) => [unit.id, unit]));
  }, [businessUnits]);

  // Buscar orçamentos do mês
  const { data: rawBudgets = [] } = useQuery<BudgetRow[]>({
    queryKey: ['orcamentos', user?.id, monthKey],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', monthKey)
        .order('category', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const budgets = useMemo(() => {
    const findUnitByName = (name: string) => {
      return businessUnits.find(
        (unit) => unit.name.localeCompare(name, "pt-BR", { sensitivity: "accent" }) === 0
      );
    };

    return rawBudgets
      .map((budget) => {
        let resolvedUnitId = budget.category;
        let unit = unitMap.get(resolvedUnitId);

        if (!unit) {
          const match = findUnitByName(budget.category);
          if (match) {
            resolvedUnitId = match.id;
            unit = match;
          }
        }

        return {
          id: budget.id,
          business_unit_id: resolvedUnitId,
          business_unit_name: unit?.name ?? budget.category,
          limit_amount: Number(budget.limit_amount),
          month: budget.month,
          alert_threshold: budget.alert_threshold ?? 80,
        };
      })
      .sort((a, b) => a.business_unit_name.localeCompare(b.business_unit_name, "pt-BR"));
  }, [rawBudgets, unitMap, businessUnits]);

  // Buscar gastos reais do mês por unidade de negócio
  const { data: gastosPorUnidade = {} } = useQuery<Record<string, number>>({
    queryKey: ['gastos-unidade', user?.id, monthKey],
    queryFn: async () => {
      if (!user) return {};

      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('financial_items')
        .select('amount, business_unit_id')
        .eq('type', 'despesa')
        .eq('user_id', user.id)
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      if (error) throw error;

      const gastos = (data || []).reduce((acc, item) => {
        const unitId = item.business_unit_id || 'sem-unidade';
        acc[unitId] = (acc[unitId] || 0) + Number(item.amount);
        return acc;
      }, {} as Record<string, number>);

      return gastos;
    },
    enabled: !!user,
  });

  // Criar orçamento
  const createOrcamentoMutation = useMutation({
    mutationFn: async (data: CreateBudgetPayload) => {
      if (!user) throw new Error('User not authenticated');
      if (!data.business_unit_id) throw new Error('Selecione uma unidade de negócio');

      const { error } = await supabase
        .from('budgets')
        .insert({
          category: data.business_unit_id,
          limit_amount: data.limit_amount,
          alert_threshold: data.alert_threshold,
          month: monthKey,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos', user?.id, monthKey] });
      queryClient.invalidateQueries({ queryKey: ['gastos-unidade', user?.id, monthKey] });
      toast.success('Meta criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar meta: ${error.message}`);
    },
  });

  // Atualizar orçamento
  const updateOrcamentoMutation = useMutation({
    mutationFn: async ({ id, data }: UpdateBudgetPayload) => {
      const payload: Record<string, unknown> = {};

      if (data.business_unit_id) {
        payload.category = data.business_unit_id;
      }
      if (typeof data.limit_amount === "number") {
        payload.limit_amount = data.limit_amount;
      }
      if (typeof data.alert_threshold === "number") {
        payload.alert_threshold = data.alert_threshold;
      }

      if (Object.keys(payload).length === 0) return;

      const { error } = await supabase
        .from('budgets')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos', user?.id, monthKey] });
      queryClient.invalidateQueries({ queryKey: ['gastos-unidade', user?.id, monthKey] });
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
      queryClient.invalidateQueries({ queryKey: ['orcamentos', user?.id, monthKey] });
      queryClient.invalidateQueries({ queryKey: ['gastos-unidade', user?.id, monthKey] });
      toast.success('Meta excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir meta: ${error.message}`);
    },
  });

  return {
    orcamentos: budgets,
    gastosPorUnidade,
    businessUnits,
    createOrcamentoMutation,
    updateOrcamentoMutation,
    deleteOrcamentoMutation,
  };
};
