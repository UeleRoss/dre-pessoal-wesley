import { BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DashboardHeaderProps {
  selectedPeriod: '3months' | '6months' | '12months' | 'year';
  onPeriodChange: (period: '3months' | '6months' | '12months' | 'year') => void;
}

const DashboardHeader = ({ selectedPeriod, onPeriodChange }: DashboardHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-navy-800 flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Dashboard Financeiro
        </h1>
        <p className="text-navy-600 mt-1">Análise completa da sua situação financeira</p>
      </div>

      <div className="flex gap-2">
        <Select value={selectedPeriod} onValueChange={(value: any) => onPeriodChange(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3months">Últimos 3 meses</SelectItem>
            <SelectItem value="6months">Últimos 6 meses</SelectItem>
            <SelectItem value="12months">Últimos 12 meses</SelectItem>
            <SelectItem value="year">Este ano</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
