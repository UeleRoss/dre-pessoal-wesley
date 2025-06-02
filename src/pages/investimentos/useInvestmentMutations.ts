
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { InvestmentForm, TransactionForm, Investment } from "./types";

export const useInvestmentMutations = (user: any) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createInvestmentMutation = useMutation({
    mutationFn: async (data: InvestmentForm) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error: investmentError } = await supabase
        .from('investments')
        .insert([{
          name: data.name,
          category: data.category,
          initial_amount: parseFloat(data.initial_amount),
          current_balance: parseFloat(data.initial_amount),
          user_id: user.id
        }]);
      
      if (investmentError) throw investmentError;

      if (!data.is_setup && data.source_bank) {
        const { error: entryError } = await supabase
          .from('financial_items')
          .insert([{
            description: `Investimento: ${data.name}`,
            amount: parseFloat(data.initial_amount),
            type: 'saida',
            category: 'Investimentos',
            bank: data.source_bank,
            date: new Date().toISOString().split('T')[0],
            user_id: user.id,
            source: 'investimento'
          }]);

        if (entryError) throw entryError;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Investimento criado",
        description: variables.is_setup 
          ? "Investimento de setup criado com sucesso!" 
          : "Novo investimento adicionado e valor debitado!",
      });
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar investimento.",
        variant: "destructive",
      });
    }
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionForm & { investment_id: string; investment: Investment }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error: transactionError } = await supabase
        .from('investment_transactions')
        .insert([{
          investment_id: data.investment_id,
          type: data.type,
          amount: parseFloat(data.amount),
          bank: data.bank,
          description: data.description,
          date: data.date,
          user_id: user.id
        }]);
      
      if (transactionError) throw transactionError;

      const newBalance = data.type === 'aporte' 
        ? data.investment.current_balance + parseFloat(data.amount)
        : data.investment.current_balance - parseFloat(data.amount);

      const { error: updateError } = await supabase
        .from('investments')
        .update({ current_balance: newBalance })
        .eq('id', data.investment_id);

      if (updateError) throw updateError;

      if (data.bank) {
        const { error: entryError } = await supabase
          .from('financial_items')
          .insert([{
            description: `${data.type === 'aporte' ? 'Aporte em' : 'Retirada de'} investimento: ${data.investment.name}`,
            amount: parseFloat(data.amount),
            type: data.type === 'aporte' ? 'saida' : 'entrada',
            category: 'Investimentos',
            bank: data.bank,
            date: data.date,
            user_id: user.id,
            source: 'investimento'
          }]);

        if (entryError) throw entryError;
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Transação registrada",
        description: variables.type === 'aporte' ? "Aporte realizado com sucesso!" : "Retirada realizada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investment-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao registrar transação.",
        variant: "destructive",
      });
    }
  });

  const deleteInvestmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: transactionError } = await supabase
        .from('investment_transactions')
        .delete()
        .eq('investment_id', id);

      if (transactionError) throw transactionError;

      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Investimento excluído",
        description: "Investimento e histórico removidos com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investment-transactions'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir investimento.",
        variant: "destructive",
      });
    }
  });

  return {
    createInvestmentMutation,
    createTransactionMutation,
    deleteInvestmentMutation
  };
};
