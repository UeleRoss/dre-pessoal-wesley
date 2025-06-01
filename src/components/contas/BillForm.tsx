
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import ErrorBoundary from "@/components/ErrorBoundary";

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

const BillFormContent = ({ editingBill, onSubmit, onCancel }: BillFormProps) => {
  console.log("🔧 BillForm - INICIANDO RENDERIZAÇÃO");
  console.log("🔧 BillForm - editingBill:", editingBill);
  
  const { toast } = useToast();
  
  const [formData, setFormData] = useState(() => {
    console.log("🔧 BillForm - Inicializando formData");
    const initialData = {
      name: editingBill?.name || '',
      value: editingBill?.value?.toString() || '',
      due_date: editingBill?.due_date?.toString() || '',
      category: editingBill?.category || '', // Deixa vazio para forçar seleção
      bank: editingBill?.bank || '', // Deixa vazio por ser opcional
      recurring: editingBill?.recurring ?? true
    };
    console.log("🔧 BillForm - Dados iniciais:", initialData);
    return initialData;
  });

  console.log("🔧 BillForm - formData atual:", formData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🔧 BillForm - handleSubmit chamado com:", formData);
    
    if (!formData.name || !formData.value || !formData.due_date || !formData.category) {
      console.log("🔧 BillForm - Validação falhou");
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, valor, data de vencimento e categoria.",
        variant: "destructive",
      });
      return;
    }

    console.log("🔧 BillForm - Enviando dados para onSubmit");
    onSubmit(formData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    console.log(`🔧 BillForm - Alterando ${field} para:`, value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  console.log("🔧 BillForm - Renderizando JSX");

  try {
    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-500">
          BillForm carregado com sucesso - Debug: {JSON.stringify({ 
            category: formData.category, 
            bank: formData.bank 
          })}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Conta</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
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
              onChange={(e) => handleInputChange('value', e.target.value)}
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
              onChange={(e) => handleInputChange('due_date', e.target.value)}
              placeholder="Ex: 15"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Categoria</Label>
            <ErrorBoundary fallback={<div className="text-red-500">Erro no Select de Categoria</div>}>
              <Select
                value={formData.category || undefined}
                onValueChange={(value) => handleInputChange('category', value)}
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
            </ErrorBoundary>
          </div>

          <div>
            <Label htmlFor="bank">Banco (Opcional)</Label>
            <ErrorBoundary fallback={<div className="text-red-500">Erro no Select de Banco</div>}>
              <Select
                value={formData.bank || undefined}
                onValueChange={(value) => handleInputChange('bank', value || '')}
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
            </ErrorBoundary>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="recurring"
              checked={formData.recurring}
              onCheckedChange={(checked) => handleInputChange('recurring', checked)}
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
      </div>
    );
  } catch (error) {
    console.error("🚨 BillForm - Erro durante renderização:", error);
    throw error;
  }
};

const BillForm = (props: BillFormProps) => {
  return (
    <ErrorBoundary fallback={<div className="text-red-500 p-4">Erro no formulário. Verifique o console para detalhes.</div>}>
      <BillFormContent {...props} />
    </ErrorBoundary>
  );
};

export default BillForm;
