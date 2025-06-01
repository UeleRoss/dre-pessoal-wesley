
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BANKS = ['CONTA SIMPLES', 'BRADESCO', 'C6 BANK', 'ASAAS', 'NOMAD'];

interface BankBalancesCardProps {
  currentBalances: Record<string, number>;
  bills: Array<{
    bank: string;
    value: number;
    paid_this_month: boolean;
  }>;
}

const BankBalancesCard = ({ currentBalances, bills }: BankBalancesCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saldos Atuais por Banco</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BANKS.map((bank) => (
            <div key={bank} className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-navy-800">{bank}</h4>
              <p className={`text-lg font-bold ${currentBalances[bank] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currentBalances[bank].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
