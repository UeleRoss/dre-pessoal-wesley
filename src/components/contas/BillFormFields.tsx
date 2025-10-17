
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CATEGORIES } from "./constants";
import { BillFormData } from "./types";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BillFormFieldsProps {
  formData: BillFormData;
  onInputChange: (field: string, value: string | boolean) => void;
}

export const BillFormFields = ({ formData, onInputChange }: BillFormFieldsProps) => {
  // Buscar bancos do usuário
  const { data: userBanks = [] } = useQuery({
    queryKey: ['user-banks-form'],
    queryFn: async () => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return [];

      // Buscar bancos configurados
      const { data: bankBalances, error: balanceError } = await supabase
        .from('bank_balances')
        .select('bank_name')
        .eq('user_id', user.data.user.id);
      
      if (balanceError) throw balanceError;

      // Buscar bancos dos lançamentos
      const { data: financialItems, error: itemsError } = await supabase
        .from('financial_items')
        .select('bank')
        .eq('user_id', user.data.user.id);
      
      if (itemsError) throw itemsError;

      const configuredBanks = bankBalances.map(b => b.bank_name);
      const transactionBanks = [...new Set(financialItems.map(item => item.bank))].filter(Boolean);
      
      return [...new Set([...configuredBanks, ...transactionBanks])].sort();
    }
  });

  // Use safe values for selects - never empty strings
  const categoryMatch = formData.category
    ? CATEGORIES.find((category) =>
        category.localeCompare(formData.category, "pt-BR", { sensitivity: "accent" }) === 0
      )
    : undefined;
  const safeCategory = categoryMatch || undefined;
  const safeBank = formData.bank === "NONE" || (formData.bank && userBanks.includes(formData.bank)) ? formData.bank : undefined;

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
          onValueChange={(value) => onInputChange('bank', value || 'NONE')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o banco (opcional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">Sem banco específico</SelectItem>
            {userBanks.map((bank) => (
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
