
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BankBalancesCardProps {
  currentBalances: Record<string, number>;
  bills: Array<{
    bank: string;
    value: number;
    paid_this_month: boolean;
  }>;
}

const BankBalancesCard = ({ currentBalances, bills }: BankBalancesCardProps) => {
  // Buscar bancos do usuário
  const { data: userBanks = [] } = useQuery({
    queryKey: ['user-banks-card'],
    queryFn: async () => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return [];

      // Buscar bancos configurados
      const { data: bankBalances, error: balanceError } = await supabase
        .from('bank_balances')
        .select('bank_name')
        .eq('user_id', user.data.user.id);
      
      if (balanceError) throw balanceError;

      // Buscar bancos dos lançamentos
      const { data: financialItems, error: itemsError } = await supabase
        .from('financial_items')
        .select('bank')
        .eq('user_id', user.data.user.id);
      
      if (itemsError) throw itemsError;

      const configuredBanks = bankBalances.map(b => b.bank_name);
      const transactionBanks = [...new Set(financialItems.map(item => item.bank))].filter(Boolean);
      
      return [...new Set([...configuredBanks, ...transactionBanks])].sort();
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldos Atuais por Banco</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {userBanks.map((bank) => (
            <div key={bank} className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-navy-800">{bank}</h4>
              <p className={`text-lg font-bold ${(currentBalances[bank] || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(currentBalances[bank] || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-xs text-gray-500">
                Contas pendentes: {bills.filter(b => b.bank === bank && !b.paid_this_month).reduce((sum, b) => sum + b.value, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          ))}
          
          {/* Seção para contas sem banco específico */}
          <div className="p-4 bg-orange-50 rounded-lg">
            <h4 className="font-medium text-navy-800">Sem Banco Específico</h4>
            <p className="text-sm text-gray-600 mb-2">Contas que podem ser pagas por qualquer banco</p>
            <p className="text-xs text-gray-500">
              Contas pendentes: {bills.filter(b => (!b.bank || b.bank === '') && !b.paid_this_month).reduce((sum, b) => sum + b.value, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BankBalancesCard;
