
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatBrazilDate } from "@/utils/dateUtils";

export type PeriodType = 'month' | 'year' | 'all';

interface PeriodSelectorProps {
  selectedMonth: Date;
  periodType: PeriodType;
  onMonthChange: (month: Date) => void;
  onPeriodTypeChange: (type: PeriodType) => void;
}

const PeriodSelector = ({ selectedMonth, periodType, onMonthChange, onPeriodTypeChange }: PeriodSelectorProps) => {
  const previousMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  const previousYear = () => {
    const newDate = new Date(selectedMonth);
    newDate.setFullYear(newDate.getFullYear() - 1);
    onMonthChange(newDate);
  };

  const nextYear = () => {
    const newDate = new Date(selectedMonth);
    newDate.setFullYear(newDate.getFullYear() + 1);
    onMonthChange(newDate);
  };

  const goToCurrent = () => {
    onMonthChange(new Date());
  };

  const getDisplayText = () => {
    switch (periodType) {
      case 'month':
        return formatBrazilDate(selectedMonth, 'MMMM yyyy');
      case 'year':
        return selectedMonth.getFullYear().toString();
      case 'all':
        return 'Todos os dados';
      default:
        return '';
    }
  };

  const getNavigationButtons = () => {
    if (periodType === 'all') {
      return null;
    }

    return (
      <>
        <Button 
          variant="outline" 
          onClick={periodType === 'month' ? previousMonth : previousYear}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="outline" 
          onClick={periodType === 'month' ? nextMonth : nextYear}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </>
    );
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white rounded-xl shadow-lg p-3 sm:p-4">
      {/* Seletor de período */}
      <Select value={periodType} onValueChange={onPeriodTypeChange}>
        <SelectTrigger className="w-full sm:w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="month">Mês</SelectItem>
          <SelectItem value="year">Ano</SelectItem>
          <SelectItem value="all">Todos</SelectItem>
        </SelectContent>
      </Select>

      {/* Navegação e display */}
      <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 flex-1">
        {getNavigationButtons()}

        <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center sm:justify-start">
          <h2 className="text-base sm:text-lg font-bold text-navy-800 whitespace-nowrap">
            {getDisplayText()}
          </h2>
          {periodType !== 'all' && (
            <Button variant="ghost" onClick={goToCurrent} className="text-xs sm:text-sm px-2 sm:px-4 whitespace-nowrap">
              {periodType === 'month' ? 'Mês Atual' : 'Ano Atual'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PeriodSelector;
