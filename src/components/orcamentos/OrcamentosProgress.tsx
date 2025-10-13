import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, TrendingUp } from "lucide-react";

interface Orcamento {
  id: string;
  category: string;
  limit_amount: number;
  month: string;
  alert_threshold?: number;
}

interface OrcamentosProgressProps {
  orcamentos: Orcamento[];
  gastosPorCategoria: Record<string, number>;
}

const OrcamentosProgress = ({ orcamentos, gastosPorCategoria }: OrcamentosProgressProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getProgressColor = (percentage: number, alertThreshold: number = 80) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= alertThreshold) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStatusIcon = (percentage: number, alertThreshold: number = 80) => {
    if (percentage >= 100) return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (percentage >= alertThreshold) return <TrendingUp className="h-5 w-5 text-orange-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const totalOrcamento = orcamentos.reduce((sum, orc) => sum + orc.limit_amount, 0);
  const totalGasto = Object.values(gastosPorCategoria).reduce((sum, val) => sum + val, 0);
  const percentualGeral = totalOrcamento > 0 ? (totalGasto / totalOrcamento) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Card de resumo geral */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Resumo Geral</span>
            {getStatusIcon(percentualGeral)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Total Orçado:</span>
            <span className="font-bold">{formatCurrency(totalOrcamento)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium">Total Gasto:</span>
            <span className="font-bold">{formatCurrency(totalGasto)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium">Disponível:</span>
            <span className={`font-bold ${totalOrcamento - totalGasto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalOrcamento - totalGasto)}
            </span>
          </div>
          <Progress
            value={Math.min(percentualGeral, 100)}
            className="h-3"
          />
          <p className="text-xs text-center text-muted-foreground">
            {percentualGeral.toFixed(1)}% do orçamento utilizado
          </p>
        </CardContent>
      </Card>

      {/* Cards individuais por categoria */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orcamentos.map((orcamento) => {
          const gasto = gastosPorCategoria[orcamento.category] || 0;
          const percentual = (gasto / orcamento.limit_amount) * 100;
          const alertThreshold = orcamento.alert_threshold || 80;

          return (
            <Card key={orcamento.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{orcamento.category}</span>
                  {getStatusIcon(percentual, alertThreshold)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gasto:</span>
                  <span className="font-bold">{formatCurrency(gasto)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Limite:</span>
                  <span className="font-bold">{formatCurrency(orcamento.limit_amount)}</span>
                </div>
                <Progress
                  value={Math.min(percentual, 100)}
                  className="h-2"
                />
                <p className="text-xs text-center text-muted-foreground">
                  {percentual.toFixed(1)}% utilizado
                </p>
                {percentual >= alertThreshold && percentual < 100 && (
                  <p className="text-xs text-orange-600 font-medium text-center">
                    Atenção: Próximo do limite!
                  </p>
                )}
                {percentual >= 100 && (
                  <p className="text-xs text-red-600 font-bold text-center">
                    Limite ultrapassado!
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default OrcamentosProgress;
