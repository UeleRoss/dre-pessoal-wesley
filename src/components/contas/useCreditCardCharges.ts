
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export const useCreditCardCharges = () => {
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Buscar cobranças do cartão
  const { data: charges = [] } = useQuery({
    queryKey: ['credit-card-charges', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('credit_card_charges')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const createChargeMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('credit_card_charges')
        .insert([{ ...data, user_id: user.id }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Cobrança cadastrada",
        description: "Nova cobrança do cartão adicionada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['credit-card-charges'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao cadastrar cobrança: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateChargeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('credit_card_charges')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Cobrança atualizada",
        description: "Alterações salvas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['credit-card-charges'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar cobrança.",
        variant: "destructive",
      });
    }
  });

  const deleteChargeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('credit_card_charges')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Cobrança excluída",
        description: "Cobrança removida com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['credit-card-charges'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir cobrança.",
        variant: "destructive",
      });
    }
  });

  return {
    charges,
    createChargeMutation,
    updateChargeMutation,
    deleteChargeMutation
  };
};
