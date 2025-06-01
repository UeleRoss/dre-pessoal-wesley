
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const BANKS = ['CONTA SIMPLES', 'BRADESCO', 'C6 BANK', 'ASAAS', 'NOMAD'];
const CATEGORIES = [
  "Apartamento",
  "Escritório", 
  "Contas mensais",
  "Estudos",
  "Lazer e ócio",
  "Comida",
  "Tráfego Pago",
  "Vida esportiva",
  "Go On Outdoor",
  "Carro",
  "Itens Físicos"
];

interface RecurringBill {
  id: string;
  name: string;
  value: number;
  due_date: number;
  category: string;
  bank: string;
  recurring: boolean;
  paid_this_month: boolean;
}

interface BillFormProps {
  editingBill: RecurringBill | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const BillForm = ({ editingBill, onSubmit, onCancel }: BillFormProps) => {
  const [formData, setFormData] = useState({
    name: editingBill?.name || '',
    value: editingBill?.value?.toString() || '',
    due_date: editingBill?.due_date?.toString() || '',
    category: editingBill?.category || '',
    bank: editingBill?.bank || '',
    recurring: editingBill?.recurring ?? true
  });

  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.value || !formData.due_date || !formData.category) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, valor, data de vencimento e categoria.",
        variant: "destructive",
      });
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome da Conta</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Energia Elétrica"
          required
        />
      </div>

      <div>
        <Label htmlFor="value">Valor</Label>
        <Input
          id="value"
          type="number"
          step="0.01"
          value={formData.value}
          onChange={(e) => setFormData({ ...formData, value: e.target.value })}
          placeholder="0.00"
          required
        />
      </div>

      <div>
        <Label htmlFor="due_date">Dia do Vencimento</Label>
        <Input
          id="due_date"
          type="number"
          min="1"
          max="31"
          value={formData.due_date}
          onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
          placeholder="Ex: 15"
          required
        />
      </div>

      <div>
        <Label htmlFor="category">Categoria</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => setFormData({ ...formData, category: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a categoria" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="bank">Banco (Opcional)</Label>
        <Select
          value={formData.bank}
          onValueChange={(value) => setFormData({ ...formData, bank: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o banco (opcional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhum banco específico</SelectItem>
            {BANKS.map((bank) => (
              <SelectItem key={bank} value={bank}>
                {bank}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="recurring"
          checked={formData.recurring}
          onCheckedChange={(checked) => setFormData({ ...formData, recurring: checked })}
        />
        <Label htmlFor="recurring">Conta recorrente (todo mês)</Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          {editingBill ? 'Atualizar' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
};

export default BillForm;
