
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, TrendingUp } from "lucide-react";
import PeriodSelector, { PeriodType } from "./PeriodSelector";
import MonthlySummaryModal from "./MonthlySummaryModal";
import IncomeSummaryModal from "./IncomeSummaryModal";

interface LancamentosHeaderProps {
  onNewEntry: () => void;
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
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
  const [showMonthlySummaryModal, setShowMonthlySummaryModal] = useState(false);
  const [showIncomeSummaryModal, setShowIncomeSummaryModal] = useState(false);

  const handleImportSuccess = () => {
    // Força atualização da página
    window.location.reload();
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Lançamentos Financeiros</h1>
        <p className="text-gray-600 mt-1">Gerencie suas entradas e saídas</p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <PeriodSelector 
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
          periodType={periodType}
          onPeriodTypeChange={onPeriodTypeChange}
        />
        
        <div className="flex gap-2">
          <Button onClick={onNewEntry} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            Novo Lançamento
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowMonthlySummaryModal(true)}
            className="flex-1 sm:flex-none"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Resumos Mensais
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowIncomeSummaryModal(true)}
            className="flex-1 sm:flex-none"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Receitas Mensais
          </Button>
        </div>
      </div>

      <MonthlySummaryModal
        isOpen={showMonthlySummaryModal}
        onClose={() => setShowMonthlySummaryModal(false)}
        onSuccess={handleImportSuccess}
      />

      <IncomeSummaryModal
        isOpen={showIncomeSummaryModal}
        onClose={() => setShowIncomeSummaryModal(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
};

export default LancamentosHeader;
