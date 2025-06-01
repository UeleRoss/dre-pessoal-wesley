
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BANKS, CATEGORIES } from "./constants";
import { BillFormData } from "./types";

interface BillFormFieldsProps {
  formData: BillFormData;
  onInputChange: (field: string, value: string | boolean) => void;
}

export const BillFormFields = ({ formData, onInputChange }: BillFormFieldsProps) => {
  // Garantir que os valores dos selects sejam sempre strings válidas
  const safeCategory = formData.category && CATEGORIES.includes(formData.category) ? formData.category : "";
  const safeBank = formData.bank && BANKS.includes(formData.bank) ? formData.bank : "";

  return (
    <>
      <div>
        <Label htmlFor="name">Nome da Conta</Label>
        <Input
          id="name"
          value={formData.name || ""}
          onChange={(e) => onInputChange('name', e.target.value)}
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
          value={formData.value || ""}
          onChange={(e) => onInputChange('value', e.target.value)}
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
          value={formData.due_date || ""}
          onChange={(e) => onInputChange('due_date', e.target.value)}
          placeholder="Ex: 15"
          required
        />
      </div>

      <div>
        <Label htmlFor="category">Categoria</Label>
        <Select
          value={safeCategory}
          onValueChange={(value) => onInputChange('category', value || '')}
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
          value={safeBank}
          onValueChange={(value) => onInputChange('bank', value || '')}
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
          checked={!!formData.recurring}
          onCheckedChange={(checked) => onInputChange('recurring', checked)}
        />
        <Label htmlFor="recurring">Conta recorrente (todo mês)</Label>
      </div>
    </>
  );
};
