
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
    <div className="flex items-center justify-between bg-white rounded-xl shadow-lg p-4 gap-4">
      <div className="flex items-center gap-4">
        <Select value={periodType} onValueChange={onPeriodTypeChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Mês</SelectItem>
            <SelectItem value="year">Ano</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center gap-4">
        {getNavigationButtons()}
        
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-navy-800">
            {getDisplayText()}
          </h2>
          {periodType !== 'all' && (
            <Button variant="ghost" onClick={goToCurrent} className="text-sm">
              {periodType === 'month' ? 'Mês Atual' : 'Ano Atual'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PeriodSelector;
