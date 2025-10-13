
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
    <div className="space-y-4">
      {/* Título */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Lançamentos Financeiros</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Gerencie suas entradas e saídas</p>
        </div>

        {/* Botão de novo lançamento - sempre visível no topo em mobile */}
        <Button onClick={onNewEntry} className="w-full sm:w-auto shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Novo Lançamento
        </Button>
      </div>

      {/* Seletor de período - linha separada */}
      <PeriodSelector
        selectedMonth={selectedMonth}
        onMonthChange={onMonthChange}
        periodType={periodType}
        onPeriodTypeChange={onPeriodTypeChange}
      />
    </div>
  );
};

export default LancamentosHeader;
