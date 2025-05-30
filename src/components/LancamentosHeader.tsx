
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import MonthSelector from "./MonthSelector";

interface LancamentosHeaderProps {
  onNewEntry: () => void;
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
}

const LancamentosHeader = ({ onNewEntry, selectedMonth, onMonthChange }: LancamentosHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-navy-800">Lançamentos Financeiros</h1>
        <p className="text-navy-600 mt-1">
          Gerencie suas receitas e despesas de forma eficiente
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <Button onClick={onNewEntry}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lançamento
        </Button>
        
        <MonthSelector 
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
        />
      </div>
    </div>
  );
};

export default LancamentosHeader;
