
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FinancialItem } from "@/types/financial";

export const useFinancialMutations = (allItems: FinancialItem[]) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

      const itemsToDelete = allItems.filter(item => ids.includes(item.id));
      const financialItemIds = itemsToDelete.filter(item => item.source !== 'financial_summary' && item.source !== 'financial_summary_income').map(item => item.id);
      const summaryIds = itemsToDelete.filter(item => item.source === 'financial_summary').map(item => item.id);
      const incomeSummaryIds = itemsToDelete.filter(item => item.source === 'financial_summary_income').map(item => item.id);

      let totalDeleted = 0;

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
    deleteMutation,
    deleteMultipleMutation
  };
};
