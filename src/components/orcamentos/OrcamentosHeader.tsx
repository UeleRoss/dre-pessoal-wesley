import { Target, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface OrcamentosHeaderProps {
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  onNewOrcamento: () => void;
}

const OrcamentosHeader = ({ selectedMonth, onMonthChange, onNewOrcamento }: OrcamentosHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-navy-800 flex items-center gap-2">
          <Target className="h-8 w-8" />
          Metas e Orçamentos
        </h1>
        <p className="text-navy-600 mt-1">Defina e acompanhe suas metas de gastos por categoria</p>
      </div>

      <div className="flex gap-2 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedMonth}
              onSelect={(date) => date && onMonthChange(date)}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>

        <Button onClick={onNewOrcamento}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
      </div>
    </div>
  );
};

export default OrcamentosHeader;
