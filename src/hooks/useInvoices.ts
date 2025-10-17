import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCardInvoice } from "@/types/financial";

export const useInvoices = (userId: string, month?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query: Buscar faturas consolidadas do mês
  const { data: invoices = [], isLoading, refetch } = useQuery<CreditCardInvoice[]>({
    queryKey: ['invoices', userId, month],
    queryFn: async () => {
      if (!month) {
        // Se não foi passado mês, buscar todas as faturas
        const { data, error } = await supabase
          .from('credit_card_invoices')
          .select('*')
          .eq('user_id', userId)
          .order('reference_month', { ascending: false })
          .order('card_name');

        if (error) throw error;
        return data || [];
      }

      const referenceMonth = `${month}-01`;

      const { data, error } = await supabase
        .from('credit_card_invoices')
        .select('*')
        .eq('user_id', userId)
        .eq('reference_month', referenceMonth)
        .order('card_name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  // Query: Buscar lançamentos detalhados de um cartão específico no mês
  const useInvoiceDetails = (cardName: string) => {
    return useQuery({
      queryKey: ['invoice-details', userId, month, cardName],
      queryFn: async () => {
        const startDate = `${month}-01`;
        const endDate = `${month}-31`;

        const { data, error } = await supabase
          .from('financial_items')
          .select('*')
          .eq('user_id', userId)
          .eq('credit_card', cardName)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date');

        if (error) throw error;
        return data || [];
      },
      enabled: !!userId && !!month && !!cardName
    });
  };

  // Mutation: Marcar fatura como paga/não paga
  const markAsPaid = useMutation({
    mutationFn: async ({
      cardId,
      referenceMonth,
      paid = true,
      paymentDate = null
    }: {
      cardId: string;
      referenceMonth: string;
      paid?: boolean;
      paymentDate?: string | null;
    }) => {
      // Buscar fatura total do mês
      const invoice = invoices.find(
        inv => inv.credit_card_id === cardId && inv.reference_month === referenceMonth
      );
      if (!invoice) throw new Error('Fatura não encontrada');

      const paymentDateValue = paid && !paymentDate
        ? new Date().toISOString().split('T')[0]
        : paymentDate;

      // Verificar se já existe registro de pagamento
      const { data: existing } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('user_id', userId)
        .eq('credit_card_id', cardId)
        .eq('reference_month', referenceMonth)
        .single();

      if (existing) {
        // Atualizar existente
        const { error } = await supabase
          .from('invoice_payments')
          .update({
            paid,
            payment_date: paymentDateValue,
            invoice_amount: invoice.total_amount
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Criar novo
        const { error } = await supabase
          .from('invoice_payments')
          .insert([{
            user_id: userId,
            credit_card_id: cardId,
            reference_month: referenceMonth,
            invoice_amount: invoice.total_amount,
            paid,
            payment_date: paymentDateValue
          }]);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: "Status atualizado",
        description: "O status da fatura foi atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation: Adicionar nota à fatura
  const addNote = useMutation({
    mutationFn: async ({
      cardId,
      referenceMonth,
      note
    }: {
      cardId: string;
      referenceMonth: string;
      note: string;
    }) => {
      const invoice = invoices.find(
        inv => inv.credit_card_id === cardId && inv.reference_month === referenceMonth
      );
      if (!invoice) throw new Error('Fatura não encontrada');

      const { data: existing } = await supabase
        .from('invoice_payments')
        .select('*')
        .eq('user_id', userId)
        .eq('credit_card_id', cardId)
        .eq('reference_month', referenceMonth)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('invoice_payments')
          .update({ notes: note })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('invoice_payments')
          .insert([{
            user_id: userId,
            credit_card_id: cardId,
            reference_month: referenceMonth,
            invoice_amount: invoice.total_amount,
            paid: false,
            notes: note
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: "Nota adicionada",
        description: "A nota foi salva com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar nota",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    invoices,
    isLoading,
    refetch,
    useInvoiceDetails,
    markAsPaid,
    addNote,
    isMarkingAsPaid: markAsPaid.isPending,
    isAddingNote: addNote.isPending,
  };
};
