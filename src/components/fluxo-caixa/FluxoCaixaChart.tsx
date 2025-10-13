import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface FluxoCaixaChartProps {
  projection: Array<{
    month: string;
    monthName: string;
    saldoInicial: number;
    receitas: number;
    despesas: number;
    saldoFinal: number;
  }>;
}

const FluxoCaixaChart = ({ projection }: FluxoCaixaChartProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const chartData = projection.map(month => ({
    month: month.monthName,
    Receitas: month.receitas,
    Despesas: -month.despesas, // Negativo para mostrar abaixo do eixo
    Saldo: month.saldoFinal,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de evolução do saldo */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Saldo Projetado</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="Saldo" stroke="#8b5cf6" strokeWidth={3} name="Saldo" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de receitas vs despesas */}
      <Card>
        <CardHeader>
          <CardTitle>Receitas vs Despesas por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={(value: number) => formatCurrency(Math.abs(value))} />
              <Legend />
              <ReferenceLine y={0} stroke="#666" />
              <Bar dataKey="Receitas" fill="#10b981" name="Receitas" />
              <Bar dataKey="Despesas" fill="#ef4444" name="Despesas" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default FluxoCaixaChart;
