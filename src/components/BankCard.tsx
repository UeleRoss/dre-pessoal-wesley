
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface BankCardProps {
  name: string;
  balance: number;
  previousBalance?: number;
  className?: string;
}

const BankCard = ({ name, balance, previousBalance = 0, className }: BankCardProps) => {
  const isPositive = balance >= 0;
  const change = balance - previousBalance;
  const hasChange = previousBalance !== 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className={cn(
      "bg-white rounded-xl shadow-lg p-6 border-l-4 transition-all duration-300 hover:shadow-xl",
      isPositive ? "border-l-green-500" : "border-l-red-500",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-navy-800 text-lg">{name}</h3>
        {hasChange && (
          <div className={cn(
            "flex items-center space-x-1 text-sm",
            change >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {change >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>{formatCurrency(Math.abs(change))}</span>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <p className={cn(
          "text-2xl font-bold",
          isPositive ? "text-green-600" : "text-red-600"
        )}>
          {formatCurrency(balance)}
        </p>
        <p className="text-sm text-navy-500">Saldo atual</p>
      </div>
    </div>
  );
};

export default BankCard;
