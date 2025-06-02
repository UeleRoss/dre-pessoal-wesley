
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Investment } from "./types";

interface InvestmentSummaryCardsProps {
  investments: Investment[];
}

const InvestmentSummaryCards = ({ investments }: InvestmentSummaryCardsProps) => {
  const totalInvested = investments.reduce((sum, inv) => sum + inv.current_balance, 0);
  const totalInitial = investments.reduce((sum, inv) => sum + inv.initial_amount, 0);
  const totalReturn = totalInvested - totalInitial;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-navy-800">
            {totalInvested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {investments.length} investimentos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Valor Inicial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-600">
            {totalInitial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Valores iniciais
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Rendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalReturn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalInitial > 0 ? ((totalReturn / totalInitial) * 100).toFixed(2) : 0}% de retorno
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentSummaryCards;
