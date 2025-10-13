import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface FluxoCaixaTimelineProps {
  projection: Array<{
    month: string;
    monthName: string;
    saldoInicial: number;
    receitas: number;
    despesas: number;
    saldoFinal: number;
  }>;
}

const FluxoCaixaTimeline = ({ projection }: FluxoCaixaTimelineProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getSaldoBadge = (saldo: number) => {
    if (saldo < 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Negativo
        </Badge>
      );
    } else if (saldo < 1000) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <TrendingDown className="h-3 w-3" />
          Baixo
        </Badge>
      );
    } else {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-600">
          <TrendingUp className="h-3 w-3" />
          Saudável
        </Badge>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline Detalhada</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Saldo Inicial</TableHead>
              <TableHead className="text-right">Receitas</TableHead>
              <TableHead className="text-right">Despesas</TableHead>
              <TableHead className="text-right">Saldo Final</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projection.map((month) => {
              const resultado = month.receitas - month.despesas;

              return (
                <TableRow key={month.month}>
                  <TableCell className="font-medium">{month.monthName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(month.saldoInicial)}</TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    {formatCurrency(month.receitas)}
                  </TableCell>
                  <TableCell className="text-right text-red-600 font-medium">
                    {formatCurrency(month.despesas)}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${month.saldoFinal >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(month.saldoFinal)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getSaldoBadge(month.saldoFinal)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default FluxoCaixaTimeline;
