import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface DashboardCategoryAnalysisProps {
  data: {
    categoryTrends: Array<{
      category: string;
      currentMonth: number;
      previousMonth: number;
      trend: 'up' | 'down' | 'stable';
      percentage: number;
    }>;
  };
}

const DashboardCategoryAnalysis = ({ data }: DashboardCategoryAnalysisProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendBadge = (trend: 'up' | 'down' | 'stable', percentage: number) => {
    const variant = trend === 'up' ? 'destructive' : trend === 'down' ? 'default' : 'secondary';
    const sign = trend === 'up' ? '+' : trend === 'down' ? '-' : '';

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {getTrendIcon(trend)}
        {sign}{Math.abs(percentage).toFixed(1)}%
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Tendências por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Mês Atual</TableHead>
              <TableHead className="text-right">Mês Anterior</TableHead>
              <TableHead className="text-center">Tendência</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.categoryTrends.map((item) => (
              <TableRow key={item.category}>
                <TableCell className="font-medium">{item.category}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.currentMonth)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(item.previousMonth)}
                </TableCell>
                <TableCell className="text-center">
                  {getTrendBadge(item.trend, item.percentage)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default DashboardCategoryAnalysis;
