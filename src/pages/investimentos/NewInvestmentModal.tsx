
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { BANKS } from "./constants";
import type { InvestmentForm } from "./types";

interface NewInvestmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
  onSubmit: (data: InvestmentForm) => void;
  isLoading: boolean;
}

const NewInvestmentModal = ({ 
  open, 
  onOpenChange, 
  categories, 
  onSubmit, 
  isLoading 
}: NewInvestmentModalProps) => {
  const [form, setForm] = useState<InvestmentForm>({
    name: '',
    category: '',
    initial_amount: '',
    is_setup: false,
    source_bank: ''
  });
  const { toast } = useToast();

  const resetForm = () => {
    setForm({
      name: '',
      category: '',
      initial_amount: '',
      is_setup: false,
      source_bank: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name || !form.category || !form.initial_amount) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (!form.is_setup && !form.source_bank) {
      toast({
        title: "Banco obrigatório",
        description: "Selecione o banco de origem para investimentos que não são de setup.",
        variant: "destructive",
      });
      return;
    }

    onSubmit(form);
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
          <DialogTitle>Novo Investimento</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Investimento</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Nubank Reserva de Emergência"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={form.category}
              onValueChange={(value) => setForm({ ...form, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="initial_amount">Valor Inicial</Label>
            <Input
              id="initial_amount"
              type="number"
              step="0.01"
              value={form.initial_amount}
              onChange={(e) => setForm({ ...form, initial_amount: e.target.value })}
              placeholder="15000.00"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_setup"
              checked={form.is_setup}
              onCheckedChange={(checked) => setForm({ ...form, is_setup: checked as boolean })}
            />
            <Label htmlFor="is_setup" className="text-sm">
              Setup inicial (não descontar do caixa)
            </Label>
          </div>

          {!form.is_setup && (
            <div>
              <Label htmlFor="source_bank">Banco de Origem</Label>
              <Select
                value={form.source_bank}
                onValueChange={(value) => setForm({ ...form, source_bank: value })}
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
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              Criar Investimento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewInvestmentModal;
