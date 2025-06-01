
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FinancialItem } from "@/types/financial";

export const useFinancialMutations = (allItems: FinancialItem[]) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log("🗑️ Deletando item individual:", id);
      
      // Primeiro, vamos verificar qual tabela este item pertence
      const item = allItems.find(item => item.id === id);
      if (!item) {
        throw new Error("Item não encontrado");
      }

      console.log("📋 Item a ser deletado:", item);

      if (item.source === 'financial_summary') {
        console.log("🗑️ Deletando da tabela financial_summary");
        const { error } = await supabase
          .from('financial_summary')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      } else if (item.source === 'financial_summary_income') {
        console.log("🗑️ Deletando da tabela financial_summary_income");
        const { error } = await supabase
          .from('financial_summary_income')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      } else {
        console.log("🗑️ Deletando da tabela financial_items");
        const { error } = await supabase
          .from('financial_items')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      }

      return { deleted: 1 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
      queryClient.invalidateQueries({ queryKey: ['all-financial-items'] });
      toast({
        title: "Sucesso",
        description: "Lançamento deletado com sucesso!",
      });
    },
    onError: (error: any) => {
      console.error("❌ Erro ao deletar item:", error);
      toast({
        title: "Erro",
        description: "Erro ao deletar lançamento: " + (error.message || "Erro desconhecido"),
        variant: "destructive",
      });
    }
  });

  const deleteMultipleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      console.log("🗑️ Deletando múltiplos itens:", ids.length, "itens");
      
      if (ids.length === 0) {
        throw new Error("Nenhum item selecionado para deletar");
      }

      const itemsToDelete = allItems.filter(item => ids.includes(item.id));
      const financialItemIds = itemsToDelete.filter(item => !item.source || item.source === null).map(item => item.id);
      const summaryIds = itemsToDelete.filter(item => item.source === 'financial_summary').map(item => item.id);
      const incomeSummaryIds = itemsToDelete.filter(item => item.source === 'financial_summary_income').map(item => item.id);

      let totalDeleted = 0;

      console.log("📊 Separação dos itens:", {
        financial_items: financialItemIds.length,
        summaries: summaryIds.length,
        income_summaries: incomeSummaryIds.length
      });

      if (financialItemIds.length > 0) {
        console.log(`🗑️ Deletando ${financialItemIds.length} itens da tabela financial_items`);
        
        const { error, count } = await supabase
          .from('financial_items')
          .delete()
          .in('id', financialItemIds);
        
        if (error) {
          console.error("❌ Erro ao deletar financial_items:", error);
          throw error;
        }
        
        totalDeleted += count || 0;
      }

      if (summaryIds.length > 0) {
        console.log(`🗑️ Deletando ${summaryIds.length} resumos mensais`);
        
        const { error, count } = await supabase
          .from('financial_summary')
          .delete()
          .in('id', summaryIds);
        
        if (error) {
          console.error("❌ Erro ao deletar resumos:", error);
          throw error;
        }
        
        totalDeleted += count || 0;
      }

      if (incomeSummaryIds.length > 0) {
        console.log(`🗑️ Deletando ${incomeSummaryIds.length} resumos de receitas`);
        
        const { error, count } = await supabase
          .from('financial_summary_income')
          .delete()
          .in('id', incomeSummaryIds);
        
        if (error) {
          console.error("❌ Erro ao deletar resumos de receitas:", error);
          throw error;
        }
        
        totalDeleted += count || 0;
      }
      
      console.log(`✅ Total deletado: ${totalDeleted}`);
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
      console.error("❌ Erro na mutação de deletar múltiplos:", error);
      toast({
        title: "Erro",
        description: "Erro ao deletar lançamentos: " + (error.message || "Erro desconhecido"),
        variant: "destructive",
      });
    }
  });

  return {
    deleteMutation,
    deleteMultipleMutation
  };
};
