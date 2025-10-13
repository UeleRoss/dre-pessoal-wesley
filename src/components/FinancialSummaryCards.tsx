
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { FinancialItem } from "@/types/financial";

interface FinancialSummaryCardsProps {
  items: FinancialItem[];
}

const FinancialSummaryCards = ({ items }: FinancialSummaryCardsProps) => {
  const totalEntradas = items
    .filter(item => item.type === 'entrada')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalSaidas = items
    .filter(item => item.type === 'saida')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const saldo = totalEntradas - totalSaidas;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-green-600 font-medium">Entradas</p>
              <p className="text-base md:text-lg font-bold text-green-700">
                {formatCurrency(totalEntradas)}
              </p>
            </div>
            <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm text-red-600 font-medium">Saídas</p>
              <p className="text-base md:text-lg font-bold text-red-700">
                {formatCurrency(totalSaidas)}
              </p>
            </div>
            <TrendingDown className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
          </div>
        </CardContent>
      </Card>

      <Card className={`${saldo >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs md:text-sm font-medium ${saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                Saldo
              </p>
              <p className={`text-base md:text-lg font-bold ${saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                {formatCurrency(saldo)}
              </p>
            </div>
            <div className={`h-5 w-5 md:h-6 md:w-6 rounded-full flex items-center justify-center ${
              saldo >= 0 ? 'bg-blue-600' : 'bg-orange-600'
            }`}>
              <span className="text-white text-xs font-bold">
                {saldo >= 0 ? '+' : '-'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialSummaryCards;
