
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ValueAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: number, month: string) => void;
  currentValue: number;
  selectedMonth?: Date;
}

const ValueAdjustmentModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  currentValue, 
  selectedMonth = new Date() 
}: ValueAdjustmentModalProps) => {
  const [adjustmentValue, setAdjustmentValue] = useState(currentValue.toString());
  const [selectedAdjustmentMonth, setSelectedAdjustmentMonth] = useState(
    format(selectedMonth, "yyyy-MM")
  );

  // Gerar opções de meses (6 meses para trás e 12 para frente)
  const generateMonthOptions = () => {
    const options = [];
    const baseDate = new Date();
    
    for (let i = -6; i <= 12; i++) {
      const date = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
      const value = format(date, "yyyy-MM");
      const label = format(date, "MMMM 'de' yyyy", { locale: ptBR });
      options.push({ value, label });
    }
    
    return options;
  };

  const handleSubmit = () => {
    if (!adjustmentValue || !selectedAdjustmentMonth) return;
    onSubmit(parseFloat(adjustmentValue), selectedAdjustmentMonth);
    onClose();
  };

  const handleClose = () => {
    setAdjustmentValue(currentValue.toString());
    setSelectedAdjustmentMonth(format(selectedMonth, "yyyy-MM"));
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar Valor da Conta</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="adjustment_month">Mês de aplicação</Label>
            <Select 
              value={selectedAdjustmentMonth} 
              onValueChange={setSelectedAdjustmentMonth}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {generateMonthOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-1">
              Escolha o mês onde este valor específico deve ser aplicado.
            </p>
          </div>

          <div>
            <Label htmlFor="adjustment_value">Valor para este mês</Label>
            <Input
              id="adjustment_value"
              type="number"
              step="0.01"
              value={adjustmentValue}
              onChange={(e) => setAdjustmentValue(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-sm text-gray-500 mt-1">
              Este ajuste vale apenas para o mês selecionado e não afetará os demais meses.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              Confirmar Ajuste
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ValueAdjustmentModal;
