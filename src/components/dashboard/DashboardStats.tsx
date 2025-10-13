import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpDown } from "lucide-react";

interface DashboardStatsProps {
  data: {
    totalReceitas: number;
    totalDespesas: number;
    saldoPeriodo: number;
    mediaMensal: number;
    economiaMedia: number;
    maiorDespesa: { category: string; amount: number } | null;
    maiorReceita: { source: string; amount: number } | null;
  };
}

const DashboardStats = ({ data }: DashboardStatsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const taxaEconomia = data.totalReceitas > 0
    ? ((data.totalReceitas - data.totalDespesas) / data.totalReceitas * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Total Receitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-800">
            {formatCurrency(data.totalReceitas)}
          </div>
          <p className="text-xs text-green-600 mt-1">
            Média: {formatCurrency(data.mediaMensal)}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Total Despesas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-800">
            {formatCurrency(data.totalDespesas)}
          </div>
          <p className="text-xs text-red-600 mt-1">
            Maior: {data.maiorDespesa?.category || 'N/A'}
          </p>
        </CardContent>
      </Card>

      <Card className={`bg-gradient-to-br ${data.saldoPeriodo >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm font-medium flex items-center gap-2 ${data.saldoPeriodo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            <Wallet className="h-4 w-4" />
            Saldo no Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${data.saldoPeriodo >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
            {formatCurrency(data.saldoPeriodo)}
          </div>
          <p className={`text-xs mt-1 ${data.saldoPeriodo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            {data.saldoPeriodo >= 0 ? 'Superávit' : 'Déficit'}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
            <PiggyBank className="h-4 w-4" />
            Taxa de Economia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-800">
            {formatPercent(taxaEconomia)}
          </div>
          <p className="text-xs text-purple-600 mt-1">
            Economizando: {formatCurrency(data.economiaMedia)}/mês
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;
