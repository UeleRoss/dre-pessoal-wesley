
import { PeriodType } from "@/components/PeriodSelector";
import LancamentosHeaderControls from "@/components/LancamentosHeader";

interface LancamentosHeaderProps {
  onNewEntry: () => void;
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
  periodType: PeriodType;
  onPeriodTypeChange: (type: PeriodType) => void;
}

const LancamentosHeader = ({
  onNewEntry,
  selectedMonth,
  onMonthChange,
  periodType,
  onPeriodTypeChange
}: LancamentosHeaderProps) => {
  return (
    <div className="animate-fade-in">
      <LancamentosHeaderControls
        onNewEntry={onNewEntry}
        selectedMonth={selectedMonth}
        onMonthChange={onMonthChange}
        periodType={periodType}
        onPeriodTypeChange={onPeriodTypeChange}
      />
    </div>
  );
};

export default LancamentosHeader;
