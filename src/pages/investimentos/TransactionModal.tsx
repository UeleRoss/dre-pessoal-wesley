
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BANKS } from "./constants";
import type { TransactionForm, Investment } from "./types";

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: Investment | null;
  type: 'aporte' | 'retirada';
  onSubmit: (data: TransactionForm & { investment_id: string; investment: Investment }) => void;
  isLoading: boolean;
}

const TransactionModal = ({ 
  open, 
  onOpenChange, 
  investment, 
  type, 
  onSubmit, 
  isLoading 
}: TransactionModalProps) => {
  const [form, setForm] = useState<TransactionForm>({
    type: 'aporte',
    amount: '',
    bank: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const { toast } = useToast();

  useEffect(() => {
    setForm(prev => ({ ...prev, type }));
  }, [type]);

  const resetForm = () => {
    setForm({
      type: 'aporte',
      amount: '',
      bank: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!investment || !form.amount || !form.bank) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      ...form,
      investment_id: investment.id,
      investment
    });
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === 'aporte' ? 'Novo Aporte' : 'Nova Retirada'} - {investment?.name}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="1000.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="bank">
              {type === 'aporte' ? 'Banco (origem do aporte)' : 'Banco (destino da retirada)'}
            </Label>
            <Select
              value={form.bank}
              onValueChange={(value) => setForm({ ...form, bank: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent>
                {BANKS.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Observações sobre a transação"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {type === 'aporte' ? 'Registrar Aporte' : 'Registrar Retirada'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionModal;
