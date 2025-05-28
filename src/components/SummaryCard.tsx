
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  isPercentage?: boolean;
}

const SummaryCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend = 'neutral',
  className,
  isPercentage = false 
}: SummaryCardProps) => {
  const formatValue = (val: number) => {
    if (isPercentage) {
      return `${val.toFixed(2)}%`;
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-navy-600';
    }
  };

  return (
    <div className={cn(
      "bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-orange-100 rounded-lg">
          <Icon className="h-6 w-6 text-orange-600" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-medium text-navy-600 text-sm">{title}</h3>
        <p className={cn("text-2xl font-bold", getTrendColor())}>
          {formatValue(value)}
        </p>
        {subtitle && (
          <p className="text-sm text-navy-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default SummaryCard;
