
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_INVESTMENT_CATEGORIES } from "./constants";

export const useInvestmentCategories = (user: any) => {
  return useQuery({
    queryKey: ['investment-categories', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log("Usuário não logado, retornando apenas categorias padrão");
        return DEFAULT_INVESTMENT_CATEGORIES.sort();
      }

      console.log("Buscando categorias de investimento para usuário:", user.id);

      try {
        const { data, error } = await supabase
          .from('investment_categories')
          .select('*')
          .eq('user_id', user.id)
          .order('name');
        
        if (error) {
          console.error("Erro ao buscar categorias:", error);
          return DEFAULT_INVESTMENT_CATEGORIES.sort();
        }
        
        const customCategories = data ? data.map(cat => cat.name) : [];
        const allCategories = [...DEFAULT_INVESTMENT_CATEGORIES];
        
        customCategories.forEach(cat => {
          if (!allCategories.includes(cat)) {
            allCategories.push(cat);
          }
        });
        
        console.log("Categorias de investimento carregadas:", allCategories);
        return allCategories.sort();
      } catch (error) {
        console.error("Erro inesperado ao buscar categorias:", error);
        return DEFAULT_INVESTMENT_CATEGORIES.sort();
      }
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useInvestments = (user: any) => {
  return useQuery({
    queryKey: ['investments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });
};

export const useInvestmentTransactions = (user: any) => {
  return useQuery({
    queryKey: ['investment-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('investment_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });
};
