
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useUserBanks = () => {
  // Buscar saldos configurados pelo usuário
  const { data: bankBalances = [] } = useQuery({
    queryKey: ['user-bank-balances'],
    queryFn: async () => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return [];

      const { data, error } = await supabase
        .from('bank_balances')
        .select('*')
        .eq('user_id', user.data.user.id);
      
      if (error) throw error;
      return data;
    }
  });

  // Buscar bancos únicos dos lançamentos do usuário
  const { data: banksFromTransactions = [] } = useQuery({
    queryKey: ['user-banks-from-transactions'],
    queryFn: async () => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return [];

      const { data, error } = await supabase
        .from('financial_items')
        .select('bank')
        .eq('user_id', user.data.user.id);
      
      if (error) throw error;
      
      const uniqueBanks = [...new Set(data.map(item => item.bank))].filter(Boolean);
      return uniqueBanks;
    }
  });

  // Combinar e retornar todos os bancos do usuário
  const allUserBanks = React.useMemo(() => {
    const configuredBanks = bankBalances.map(b => b.bank_name);
    const allBanks = [...new Set([...configuredBanks, ...banksFromTransactions])];
    return allBanks.sort();
  }, [bankBalances, banksFromTransactions]);

  return {
    allUserBanks,
    bankBalances,
    banksFromTransactions
  };
};
