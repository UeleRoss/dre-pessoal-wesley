
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ContasSummaryCardsProps {
  totals: {
    totalBills: number;
    paidBills: number;
    unpaidBills: number;
    remainingCash: number;
  };
  billsCount: {
    total: number;
    paid: number;
  };
}

const ContasSummaryCards = ({ totals, billsCount }: ContasSummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total de Contas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-navy-800">
            {totals.totalBills.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {billsCount.total} contas cadastradas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Contas Pagas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {totals.paidBills.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {billsCount.paid} de {billsCount.total} pagas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Contas Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {totals.unpaidBills.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {billsCount.total - billsCount.paid} pendentes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Saldo Restante
            {totals.remainingCash < 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${totals.remainingCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totals.remainingCash.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totals.remainingCash < 0 ? 'Saldo insuficiente!' : 'Após pagar todas as contas'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContasSummaryCards;
