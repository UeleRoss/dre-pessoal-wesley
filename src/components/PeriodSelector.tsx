
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
          size="sm"
          onClick={periodType === 'month' ? previousMonth : previousYear}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={periodType === 'month' ? nextMonth : nextYear}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </>
    );
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-white rounded-lg sm:rounded-xl shadow-md sm:shadow-lg p-2 sm:p-3 md:p-4">
      {/* Seletor de período */}
      <Select value={periodType} onValueChange={onPeriodTypeChange}>
        <SelectTrigger className="w-full sm:w-28 md:w-32 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="month">Mês</SelectItem>
          <SelectItem value="year">Ano</SelectItem>
          <SelectItem value="all">Todos</SelectItem>
        </SelectContent>
      </Select>

      {/* Navegação e display */}
      <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 md:gap-3 flex-1">
        {getNavigationButtons()}

        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-1 justify-center sm:justify-start min-w-0">
          <h2 className="text-sm sm:text-base md:text-lg font-bold text-navy-800 truncate">
            {getDisplayText()}
          </h2>
          {periodType !== 'all' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goToCurrent}
              className="text-xs sm:text-sm px-1.5 sm:px-2 md:px-4 h-8 whitespace-nowrap shrink-0"
            >
              {periodType === 'month' ? 'Atual' : 'Atual'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PeriodSelector;
