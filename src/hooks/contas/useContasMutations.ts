import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RecurringBill } from "./types";

export const useContasMutations = (user: any, currentMonthKey: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createBillMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("💾 Iniciando criação de conta:", data);
      console.log("👤 Usuário atual:", user?.email);
      
      if (!user?.id) {
        console.error("❌ Usuário não autenticado");
        throw new Error('Usuário não autenticado');
      }

      const billData = {
        ...data,
        value: parseFloat(data.value),
        due_date: parseInt(data.due_date),
        bank: data.bank || '',
        user_id: user.id
      };
      
      console.log("📊 Dados processados para inserção:", billData);

      const { data: result, error } = await supabase
        .from('recurring_bills')
        .insert([billData])
        .select();
      
      if (error) {
        console.error("❌ Erro do Supabase:", error);
        throw error;
      }
      
      console.log("✅ Conta criada com sucesso:", result);
      return result;
    },
    onSuccess: () => {
      console.log("🎉 Sucesso na criação da conta");
      toast({
        title: "Conta cadastrada",
        description: "Conta adicionada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
    },
    onError: (error) => {
      console.error("💥 Erro na mutation:", error);
      toast({
        title: "Erro",
        description: `Erro ao cadastrar conta: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateBillMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RecurringBill> }) => {
      const { error } = await supabase
        .from('recurring_bills')
        .update({
          ...data,
          bank: data.bank || ''
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Conta atualizada",
        description: "Alterações salvas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar conta.",
        variant: "destructive",
      });
    }
  });

  const adjustBillMutation = useMutation({
    mutationFn: async ({ billId, value }: { billId: string; value: number }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      console.log("💾 Salvando ajuste mensal:", { billId, value, month: currentMonthKey, user_id: user.id });
      
      // Primeiro, verificar se já existe uma instância para este mês
      const { data: existingInstance } = await supabase
        .from('recurring_bills_instances')
        .select('*')
        .eq('bill_id', billId)
        .eq('month_reference', currentMonthKey)
        .eq('user_id', user.id)
        .single();

      if (existingInstance) {
        // Se existe, apenas atualizar o valor_ajustado
        const { error } = await supabase
          .from('recurring_bills_instances')
          .update({ valor_ajustado: value })
          .eq('id', existingInstance.id);
        
        if (error) throw error;
      } else {
        // Se não existe, criar nova instância com valor_ajustado
        const { error } = await supabase
          .from('recurring_bills_instances')
          .insert({
            bill_id: billId,
            month_reference: currentMonthKey,
            valor_ajustado: value,
            pago: false, // sempre iniciar como não pago
            user_id: user.id
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Valor ajustado",
        description: `Valor da conta ajustado para o mês selecionado!`,
      });
      queryClient.invalidateQueries({ queryKey: ['bill-instances'] });
    },
    onError: (error) => {
      console.error("💥 Erro ao ajustar valor:", error);
      toast({
        title: "Erro",
        description: "Erro ao ajustar valor da conta.",
        variant: "destructive",
      });
    }
  });

  const deleteBillMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_bills')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Conta excluída",
        description: "Conta removida com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir conta.",
        variant: "destructive",
      });
    }
  });

  const togglePaidMutation = useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      console.log("💾 Salvando status de pagamento:", { billId: id, paid, month: currentMonthKey });
      
      // Primeiro, verificar se já existe uma instância para este mês
      const { data: existingInstance } = await supabase
        .from('recurring_bills_instances')
        .select('*')
        .eq('bill_id', id)
        .eq('month_reference', currentMonthKey)
        .eq('user_id', user.id)
        .single();

      if (existingInstance) {
        // Se existe, apenas atualizar o status pago
        const { error } = await supabase
          .from('recurring_bills_instances')
          .update({ pago: paid })
          .eq('id', existingInstance.id);
        
        if (error) throw error;
      } else {
        // Se não existe, criar nova instância com status pago
        const { error } = await supabase
          .from('recurring_bills_instances')
          .insert({
            bill_id: id,
            month_reference: currentMonthKey,
            pago: paid,
            valor_ajustado: null, // sem valor ajustado inicialmente
            user_id: user.id
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-instances'] });
    },
    onError: (error) => {
      console.error("💥 Erro ao alterar status de pagamento:", error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status de pagamento.",
        variant: "destructive",
      });
    }
  });

  return {
    createBillMutation,
    updateBillMutation,
    adjustBillMutation,
    deleteBillMutation,
    togglePaidMutation
  };
};