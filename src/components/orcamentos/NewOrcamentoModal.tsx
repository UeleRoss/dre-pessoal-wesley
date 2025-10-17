import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BusinessUnit } from "@/types/business-unit";

interface NewOrcamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { business_unit_id: string; limit_amount: number; alert_threshold: number }) => void;
  isLoading: boolean;
  businessUnits: BusinessUnit[];
}

const NewOrcamentoModal = ({ open, onOpenChange, onSubmit, isLoading, businessUnits }: NewOrcamentoModalProps) => {
  const [businessUnitId, setBusinessUnitId] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("80");

  const hasBusinessUnits = businessUnits.length > 0;
  const selectedBusinessUnitName = useMemo(() => {
    return businessUnits.find((unit) => unit.id === businessUnitId)?.name ?? "";
  }, [businessUnits, businessUnitId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessUnitId || !limitAmount) return;
    const parsedLimit = parseFloat(limitAmount);
    if (Number.isNaN(parsedLimit) || parsedLimit <= 0) return;

    const parsedAlert = parseInt(alertThreshold || "0", 10);

    onSubmit({
      business_unit_id: businessUnitId,
      limit_amount: parsedLimit,
      alert_threshold: Number.isNaN(parsedAlert) ? 80 : parsedAlert,
    });

    // Reset form
    setBusinessUnitId("");
    setLimitAmount("");
    setAlertThreshold("80");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Meta de Orçamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="businessUnit">Unidade de Negócio</Label>
            <Select
              value={businessUnitId}
              onValueChange={setBusinessUnitId}
              disabled={!hasBusinessUnits}
            >
              <SelectTrigger>
                <SelectValue placeholder={hasBusinessUnits ? "Selecione uma unidade" : "Cadastre uma unidade primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {businessUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: unit.color }}
                      />
                      {unit.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!hasBusinessUnits && (
              <p className="text-xs text-muted-foreground mt-2">
                Cadastre unidades de negócio na tela de Lançamentos para criar metas.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="limitAmount">Valor Limite (R$)</Label>
            <Input
              id="limitAmount"
              type="number"
              step="0.01"
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              placeholder="0,00"
              required
            />
          </div>

          <div>
            <Label htmlFor="alertThreshold">Alerta em (%) - opcional</Label>
            <Input
              id="alertThreshold"
              type="number"
              min="1"
              max="100"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
              placeholder="80"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Receber alerta ao atingir este percentual do limite
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !hasBusinessUnits || !businessUnitId}
            >
              {isLoading ? 'Criando...' : selectedBusinessUnitName ? `Criar Meta para ${selectedBusinessUnitName}` : 'Criar Meta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewOrcamentoModal;
