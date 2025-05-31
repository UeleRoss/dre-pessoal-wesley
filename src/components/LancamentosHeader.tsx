
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, FileText, ClipboardPaste, Calendar } from "lucide-react";
import MonthSelector from "./MonthSelector";
import CSVImportModal from "./CSVImportModal";
import RawPasteModal from "./RawPasteModal";
import MonthlySummaryModal from "./MonthlySummaryModal";

interface LancamentosHeaderProps {
  onNewEntry: () => void;
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
}

const LancamentosHeader = ({ onNewEntry, selectedMonth, onMonthChange }: LancamentosHeaderProps) => {
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showRawPasteModal, setShowRawPasteModal] = useState(false);
  const [showMonthlySummaryModal, setShowMonthlySummaryModal] = useState(false);

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
        <MonthSelector 
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
        />
        
        <div className="flex gap-2">
          <Button onClick={onNewEntry} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            Novo Lançamento
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowCSVModal(true)}
            className="flex-1 sm:flex-none"
          >
            <FileText className="h-4 w-4 mr-2" />
            Importar CSV/XLSX
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowRawPasteModal(true)}
            className="flex-1 sm:flex-none"
          >
            <ClipboardPaste className="h-4 w-4 mr-2" />
            Raw Paste
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowMonthlySummaryModal(true)}
            className="flex-1 sm:flex-none"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Resumos Mensais
          </Button>
        </div>
      </div>

      <CSVImportModal
        isOpen={showCSVModal}
        onClose={() => setShowCSVModal(false)}
        onSuccess={handleImportSuccess}
      />

      <RawPasteModal
        isOpen={showRawPasteModal}
        onClose={() => setShowRawPasteModal(false)}
        onSuccess={handleImportSuccess}
      />

      <MonthlySummaryModal
        isOpen={showMonthlySummaryModal}
        onClose={() => setShowMonthlySummaryModal(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
};

export default LancamentosHeader;
