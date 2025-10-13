import { supabase } from "@/integrations/supabase/client";

/**
 * Verifica e gera automaticamente contas recorrentes pendentes para o mês atual
 * Esta função deve ser chamada quando o usuário abre o app
 */
export const checkAndGenerateRecurringExpenses = async (userId: string) => {
  try {
    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const currentMonthStr = currentMonth.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log('🔄 Verificando contas recorrentes para:', currentMonthStr);

    const { error } = await supabase.rpc('generate_pending_recurring_expenses', {
      target_user_id: userId,
      target_month: currentMonthStr
    });

    if (error) {
      console.error('❌ Erro ao gerar contas recorrentes:', error);
      throw error;
    }

    console.log('✅ Contas recorrentes verificadas/geradas com sucesso');
  } catch (error) {
    console.error('❌ Erro no scheduler de recorrentes:', error);
    // Não lançar erro para não quebrar o fluxo do app
  }
};

/**
 * Gera contas recorrentes para um mês específico
 */
export const generateRecurringExpensesForMonth = async (
  userId: string,
  year: number,
  month: number // 1-12
) => {
  try {
    const targetMonth = new Date(year, month - 1, 1);
    const targetMonthStr = targetMonth.toISOString().split('T')[0];

    console.log('🔄 Gerando contas recorrentes para:', targetMonthStr);

    const { error } = await supabase.rpc('generate_pending_recurring_expenses', {
      target_user_id: userId,
      target_month: targetMonthStr
    });

    if (error) {
      console.error('❌ Erro ao gerar contas recorrentes:', error);
      throw error;
    }

    console.log('✅ Contas recorrentes geradas para:', targetMonthStr);
    return true;
  } catch (error) {
    console.error('❌ Erro ao gerar recorrentes para mês específico:', error);
    return false;
  }
};
