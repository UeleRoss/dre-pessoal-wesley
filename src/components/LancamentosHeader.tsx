
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import PeriodSelector, { PeriodType } from "./PeriodSelector";
import { FinancialItem } from "@/types/financial";

interface LancamentosHeaderProps {
  onNewEntry: () => void;
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  periodType: PeriodType;
  onPeriodTypeChange: (type: PeriodType) => void;
  financialItems?: FinancialItem[];
}

const LancamentosHeader = ({
  onNewEntry,
  selectedMonth,
  onMonthChange,
  periodType,
  onPeriodTypeChange,
}: LancamentosHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 mb-4 md:mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Lançamentos Financeiros</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Gerencie suas entradas e saídas</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <PeriodSelector
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
          periodType={periodType}
          onPeriodTypeChange={onPeriodTypeChange}
        />

        <Button onClick={onNewEntry} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Novo Lançamento</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>
    </div>
  );
};

export default LancamentosHeader;
