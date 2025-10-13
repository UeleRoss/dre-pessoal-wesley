import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BusinessUnit } from "@/types/business-unit";

export const useBusinessUnits = (user: any) => {
  const queryClient = useQueryClient();

  // Buscar unidades de negócio do usuário
  const { data: businessUnits = [], isLoading, error, isError } = useQuery({
    queryKey: ['business-units', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('[useBusinessUnits] Usuário não disponível');
        return [];
      }

      console.log('[useBusinessUnits] Buscando unidades para usuário:', user.id);

      try {
        const { data, error } = await supabase
          .from('business_units')
          .select('*')
          .eq('user_id', user.id)
          .order('name');

        if (error) {
          console.error('[useBusinessUnits] Erro ao buscar unidades:', error);
          throw error;
        }

        console.log('[useBusinessUnits] Unidades encontradas:', data?.length || 0);
        return (data || []) as BusinessUnit[];
      } catch (err) {
        console.error('[useBusinessUnits] Erro inesperado:', err);
        return [];
      }
    },
    enabled: !!user?.id,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Criar nova unidade de negócio
  const createBusinessUnitMutation = useMutation({
    mutationFn: async (newUnit: Partial<BusinessUnit>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('business_units')
        .insert({
          name: newUnit.name,
          color: newUnit.color || '#3b82f6',
          icon: newUnit.icon || 'building',
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BusinessUnit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] });
    },
    onError: (error: any) => {
      console.error('Erro ao criar unidade:', error);
    },
  });

  // Atualizar unidade de negócio
  const updateBusinessUnitMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BusinessUnit> }) => {
      const { data, error } = await supabase
        .from('business_units')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BusinessUnit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] });
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar unidade:', error);
    },
  });

  // Deletar unidade de negócio
  const deleteBusinessUnitMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('business_units')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-units'] });
    },
    onError: (error: any) => {
      console.error('Erro ao excluir unidade:', error);
    },
  });

  return {
    businessUnits,
    isLoading,
    createBusinessUnitMutation,
    updateBusinessUnitMutation,
    deleteBusinessUnitMutation,
  };
};

// Hook para obter sugestão de unidade baseada na categoria
export const useSuggestedBusinessUnit = (category: string, businessUnits: BusinessUnit[]) => {
  const { CATEGORY_TO_BUSINESS_UNIT_MAP } = require('@/types/business-unit');

  const suggestedUnitName = CATEGORY_TO_BUSINESS_UNIT_MAP[category];

  if (!suggestedUnitName) return null;

  return businessUnits.find(unit => unit.name === suggestedUnitName);
};
