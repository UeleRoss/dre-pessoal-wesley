
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, FileUp, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import PeriodSelector, { PeriodType } from "./PeriodSelector";
import { FinancialItem } from "@/types/financial";

interface LancamentosHeaderProps {
  onNewEntry: () => void;
  onImportPDF?: () => void;
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
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
}: LancamentosHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Versão Desktop - visível em telas médias e grandes */}
      <div className="hidden md:block space-y-4">
        {/* Título */}
        <div className="flex flex-row justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Lançamentos Financeiros</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Gerencie suas entradas e saídas</p>
          </div>

          {/* Botões de ação */}
          <div className="flex flex-row gap-2">
            {onImportPDF && (
              <Button
                onClick={onImportPDF}
                variant="outline"
                size="sm"
              >
                <FileUp className="h-4 w-4 mr-2" />
                Importar PDF
              </Button>
            )}
            <Button onClick={onNewEntry} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Lançamento
            </Button>
          </div>
        </div>

        {/* Seletor de período - linha separada */}
        <PeriodSelector
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
          periodType={periodType}
          onPeriodTypeChange={onPeriodTypeChange}
        />
      </div>

      {/* Versão Mobile - visível apenas em telas pequenas */}
      <div className="md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">Lançamentos</h1>
            <p className="text-xs text-gray-600">Gerencie suas finanças</p>
          </div>

          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Menu de Lançamentos</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Botões de ação */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">Ações</h3>
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        onNewEntry();
                        setIsMenuOpen(false);
                      }}
                      className="w-full justify-start"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Lançamento
                    </Button>
                    {onImportPDF && (
                      <Button
                        onClick={() => {
                          onImportPDF();
                          setIsMenuOpen(false);
                        }}
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <FileUp className="h-4 w-4 mr-2" />
                        Importar PDF
                      </Button>
                    )}
                  </div>
                </div>

                {/* Seletor de período */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">Período</h3>
                  <PeriodSelector
                    selectedMonth={selectedMonth}
                    onMonthChange={onMonthChange}
                    periodType={periodType}
                    onPeriodTypeChange={onPeriodTypeChange}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
};

export default LancamentosHeader;
