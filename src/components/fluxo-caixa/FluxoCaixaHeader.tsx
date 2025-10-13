import { TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FluxoCaixaHeaderProps {
  monthsAhead: number;
  onMonthsChange: (months: number) => void;
}

const FluxoCaixaHeader = ({ monthsAhead, onMonthsChange }: FluxoCaixaHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-navy-800 flex items-center gap-2">
          <TrendingUp className="h-8 w-8" />
          Fluxo de Caixa Projetado
        </h1>
        <p className="text-navy-600 mt-1">Previsão consolidada do seu saldo futuro</p>
      </div>

      <div className="flex gap-2">
        <Select value={monthsAhead.toString()} onValueChange={(value) => onMonthsChange(parseInt(value))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Próximos 3 meses</SelectItem>
            <SelectItem value="6">Próximos 6 meses</SelectItem>
            <SelectItem value="12">Próximos 12 meses</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>
    </div>
  );
};

export default FluxoCaixaHeader;
