import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface FluxoCaixaSummaryProps {
  currentBalance: number;
  projection: Array<{
    month: string;
    monthName: string;
    saldoInicial: number;
    receitas: number;
    despesas: number;
    saldoFinal: number;
  }>;
}

const FluxoCaixaSummary = ({ currentBalance, projection }: FluxoCaixaSummaryProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const lastMonth = projection[projection.length - 1];
  const totalReceitas = projection.reduce((sum, month) => sum + month.receitas, 0);
  const totalDespesas = projection.reduce((sum, month) => sum + month.despesas, 0);
  const variacao = lastMonth ? lastMonth.saldoFinal - currentBalance : 0;
  const hasNegativeMonth = projection.some(month => month.saldoFinal < 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Saldo Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-800">
            {formatCurrency(currentBalance)}
          </div>
          <p className="text-xs text-blue-600 mt-1">Base para projeção</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Receitas Previstas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-800">
            {formatCurrency(totalReceitas)}
          </div>
          <p className="text-xs text-green-600 mt-1">No período</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Despesas Previstas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-800">
            {formatCurrency(totalDespesas)}
          </div>
          <p className="text-xs text-red-600 mt-1">No período</p>
        </CardContent>
      </Card>

      <Card className={`bg-gradient-to-br ${hasNegativeMonth ? 'from-orange-50 to-orange-100 border-orange-200' : 'from-purple-50 to-purple-100 border-purple-200'}`}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-medium flex items-center gap-2 ${hasNegativeMonth ? 'text-orange-700' : 'text-purple-700'}`}>
            {hasNegativeMonth ? <AlertTriangle className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            Saldo Projetado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${hasNegativeMonth ? 'text-orange-800' : 'text-purple-800'}`}>
            {lastMonth ? formatCurrency(lastMonth.saldoFinal) : '-'}
          </div>
          <p className={`text-xs mt-1 ${hasNegativeMonth ? 'text-orange-600' : 'text-purple-600'}`}>
            {variacao >= 0 ? '+' : ''}{formatCurrency(variacao)} vs atual
          </p>
          {hasNegativeMonth && (
            <p className="text-xs text-orange-600 font-medium mt-1">
              ⚠️ Saldo negativo previsto
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FluxoCaixaSummary;
