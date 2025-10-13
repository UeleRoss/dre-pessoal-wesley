import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard } from "@/types/financial";

export const useCreditCards = (userId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query: Buscar cartões ativos do usuário
  const { data: creditCards = [], isLoading } = useQuery<CreditCard[]>({
    queryKey: ['credit-cards', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  // Mutation: Adicionar novo cartão
  const addCard = useMutation({
    mutationFn: async (card: Omit<CreditCard, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_active'>) => {
      const { error } = await supabase
        .from('credit_cards')
        .insert([{
          ...card,
          user_id: userId,
          is_active: true
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      toast({
        title: "Cartão adicionado",
        description: "O cartão foi cadastrado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar cartão",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation: Atualizar cartão
  const updateCard = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<CreditCard> }) => {
      const { error } = await supabase
        .from('credit_cards')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      toast({
        title: "Cartão atualizado",
        description: "As informações do cartão foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar cartão",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation: Desativar cartão
  const deactivateCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('credit_cards')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      toast({
        title: "Cartão desativado",
        description: "O cartão foi desativado e não aparecerá mais nas opções.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao desativar cartão",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    creditCards,
    isLoading,
    addCard,
    updateCard,
    deactivateCard,
    isAdding: addCard.isPending,
    isUpdating: updateCard.isPending,
  };
};
