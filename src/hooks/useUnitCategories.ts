import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UnitCategory } from "@/types/financial";
import { getDefaultCategoriesForUnit, TransactionType } from "@/constants/default-categories";

interface UseUnitCategoriesParams {
  userId?: string;
  businessUnitId?: string | null;
  businessUnitName?: string | null;
  type?: TransactionType | "" | null;
}

export const useUnitCategories = ({
  userId,
  businessUnitId,
  businessUnitName,
  type,
}: UseUnitCategoriesParams) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const seededKeysRef = useRef<Set<string>>(new Set());

  const normalizedType = useMemo(() => {
    if (type === "entrada" || type === "saida") {
      return type;
    }
    return null;
  }, [type]);

  const enabled = Boolean(userId && businessUnitId && normalizedType);
  const queryKey = ["unit-categories", userId, businessUnitId, normalizedType];
  const seedStorageKey = useMemo(() => {
    if (!userId || !businessUnitId || !normalizedType) return null;
    return `unit-category-seeded:${userId}:${businessUnitId}:${normalizedType}`;
  }, [userId, businessUnitId, normalizedType]);

  const {
    data: categories = [],
    isLoading,
  } = useQuery<UnitCategory[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_categories")
        .select("*")
        .eq("user_id", userId as string)
        .eq("business_unit_id", businessUnitId as string)
        .eq("type", normalizedType as string)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled,
  });

  const seedDefaultsMutation = useMutation({
    mutationFn: async (defaultNames: string[]) => {
      if (!userId || !businessUnitId || !normalizedType) {
        throw new Error("Parâmetros inválidos para criar categorias padrão.");
      }

      if (defaultNames.length === 0) return;

      const rows = defaultNames.map((name) => ({
        user_id: userId,
        business_unit_id: businessUnitId,
        type: normalizedType,
        name,
      }));

      const { error } = await supabase
        .from("unit_categories")
        .upsert(rows, { onConflict: "user_id,business_unit_id,type,name", ignoreDuplicates: true });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      if (seedStorageKey && typeof window !== "undefined") {
        window.localStorage.setItem(seedStorageKey, "true");
      }
    },
    onError: (error: any) => {
      console.error("Erro ao criar categorias padrão:", error);
      toast({
        title: "Erro ao criar categorias padrão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!userId || !businessUnitId || !normalizedType) {
        throw new Error("Parâmetros inválidos para adicionar categoria.");
      }

      const trimmed = name.trim();
      if (!trimmed) throw new Error("Nome da categoria obrigatório.");

      const { error } = await supabase.from("unit_categories").insert({
        user_id: userId,
        business_unit_id: businessUnitId,
        type: normalizedType,
        name: trimmed,
      });

      if (error) throw error;
    },
    onSuccess: (_data, name) => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Categoria adicionada",
        description: `"${name}" foi adicionada à unidade.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Nome da categoria obrigatório.");

      const { error } = await supabase
        .from("unit_categories")
        .update({ name: trimmed })
        .eq("id", id);

      if (error) throw error;
      return trimmed;
    },
    onSuccess: (newName) => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Categoria atualizada",
        description: `Categoria renomeada para "${newName}".`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("unit_categories").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Categoria removida",
        description: "A categoria foi removida desta unidade.",
      });
      return id;
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!enabled || isLoading || seedDefaultsMutation.isPending) return;

    if ((categories?.length || 0) > 0) {
      if (seedStorageKey && typeof window !== "undefined") {
        window.localStorage.setItem(seedStorageKey, "true");
      }
      return;
    }

    if (!businessUnitName || !normalizedType) return;

    if (seedStorageKey && typeof window !== "undefined") {
      if (window.localStorage.getItem(seedStorageKey) === "true") {
        return;
      }
    }

    const defaults = getDefaultCategoriesForUnit(normalizedType, businessUnitName);
    if (defaults.length === 0) return;

    const key = `${userId}-${businessUnitId}-${normalizedType}`;
    if (seededKeysRef.current.has(key)) return;

    seededKeysRef.current.add(key);
    seedDefaultsMutation.mutate(defaults);
  }, [
    enabled,
    isLoading,
    categories,
    businessUnitName,
    normalizedType,
    businessUnitId,
    userId,
    seedDefaultsMutation,
  ]);

  return {
    categories,
    isLoading: isLoading || seedDefaultsMutation.isPending,
    addCategory: (name: string) => addCategoryMutation.mutateAsync(name),
    updateCategory: (payload: { id: string; name: string }) => updateCategoryMutation.mutateAsync(payload),
    removeCategory: (id: string) => deleteCategoryMutation.mutateAsync(id),
    isAdding: addCategoryMutation.isPending,
    isUpdating: updateCategoryMutation.isPending,
    isRemoving: deleteCategoryMutation.isPending,
  };
};
