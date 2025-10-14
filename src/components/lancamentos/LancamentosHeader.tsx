
import { PeriodType } from "@/components/PeriodSelector";
import LancamentosHeaderControls from "@/components/LancamentosHeader";
import { FinancialItem } from "@/types/financial";

interface LancamentosHeaderProps {
  onNewEntry: () => void;
  onImportPDF?: () => void;
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
  periodType: PeriodType;
  onPeriodTypeChange: (type: PeriodType) => void;
  financialItems?: FinancialItem[];
}

const LancamentosHeader = ({
  onNewEntry,
  onImportPDF,
  selectedMonth,
  onMonthChange,
  periodType,
  onPeriodTypeChange,
  financialItems
}: LancamentosHeaderProps) => {
  return (
    <div className="animate-fade-in">
      <LancamentosHeaderControls
        onNewEntry={onNewEntry}
        onImportPDF={onImportPDF}
        selectedMonth={selectedMonth}
        onMonthChange={onMonthChange}
        periodType={periodType}
        onPeriodTypeChange={onPeriodTypeChange}
        financialItems={financialItems}
      />
    </div>
  );
};

export default LancamentosHeader;
