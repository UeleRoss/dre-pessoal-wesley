
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ValueAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: number) => void;
  currentValue: number;
}

const ValueAdjustmentModal = ({ isOpen, onClose, onSubmit, currentValue }: ValueAdjustmentModalProps) => {
  const [adjustmentValue, setAdjustmentValue] = useState(currentValue.toString());

  const handleSubmit = () => {
    if (!adjustmentValue) return;
    onSubmit(parseFloat(adjustmentValue));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar Valor deste Mês</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
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
              Este ajuste vale apenas para o mês atual e não afetará os próximos meses.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
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
