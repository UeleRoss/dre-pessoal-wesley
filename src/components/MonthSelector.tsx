
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatBrazilDate } from "@/utils/dateUtils";

interface MonthSelectorProps {
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
}

const MonthSelector = ({ selectedMonth, onMonthChange }: MonthSelectorProps) => {
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

  const goToCurrentMonth = () => {
    onMonthChange(new Date());
  };

  return (
    <div className="flex items-center justify-between bg-white rounded-xl shadow-lg p-4">
      <Button variant="outline" onClick={previousMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-navy-800">
          {formatBrazilDate(selectedMonth, 'MMMM yyyy')}
        </h2>
        <Button variant="ghost" onClick={goToCurrentMonth} className="text-sm">
          Mês Atual
        </Button>
      </div>
      
      <Button variant="outline" onClick={nextMonth}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default MonthSelector;
