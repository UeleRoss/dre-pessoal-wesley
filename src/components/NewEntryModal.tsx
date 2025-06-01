
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentBrazilDate } from "@/utils/dateUtils";
import { Pencil } from "lucide-react";

interface NewEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Category {
  id: string;
  name: string;
  user_id?: string;
  is_default?: boolean;
}

const BANKS = ['CONTA SIMPLES', 'BRADESCO', 'C6 BANK', 'ASAAS', 'NOMAD'];

// Categorias específicas por tipo
const SAIDA_CATEGORIES = [
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

const ENTRADA_CATEGORIES = [
  "Go On Outdoor",
  "Global Vita",
  "Hotmart Go On",
  "Produto Online",
  "Stripe/assinaturas",
  "Outras receitas"
];

const NewEntryModal = ({ isOpen, onClose, onSuccess }: NewEntryModalProps) => {
  const [formData, setFormData] = useState({
    type: '',
    amount: '',
    description: '',
    category: '',
    bank: '',
    date: getCurrentBrazilDate(),
  });
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar categorias personalizadas do usuário
  const { data: customCategories = [] } = useQuery({
    queryKey: ['custom-categories', formData.type],
    queryFn: async () => {
      if (!formData.type) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!formData.type
  });

  // Combinar categorias padrão com personalizadas baseado no tipo
  const getAvailableCategories = () => {
    if (!formData.type) return [];
    
    const defaultCategories = formData.type === 'saida' ? SAIDA_CATEGORIES : ENTRADA_CATEGORIES;
    const customCategoryNames = customCategories.map(cat => cat.name);
    
    // Filtrar categorias personalizadas que se aplicam ao tipo atual
    const relevantCustomCategories = customCategories.filter(cat => {
      // Adicionar lógica se quiser categorizar as personalizadas por tipo
      return true; // Por enquanto, mostrar todas as personalizadas
    });
    
    const allCategories = [
      ...defaultCategories.map(name => ({
        id: `default-${name}`,
        name,
        is_default: true
      })),
      ...relevantCustomCategories
    ];
    
    return allCategories;
  };

  // Criar nova categoria
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryName: string) => {
      const { data: session } = await supabase.auth.getSession();
      const user = session?.session?.user;

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: categoryName,
          user_id: user.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (newCategory) => {
      toast({
        title: "Categoria criada",
        description: `Categoria "${newCategory.name}" adicionada com sucesso!`,
      });
      setFormData({ ...formData, category: newCategory.name });
      setNewCategoryName('');
      setShowNewCategoryInput(false);
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar categoria.",
        variant: "destructive",
      });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: session } = await supabase.auth.getSession();
      const user = session?.session?.user;

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('financial_items')
        .insert([{
          ...data,
          amount: parseFloat(data.amount),
          user_id: user.id
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Lançamento criado",
        description: "Lançamento adicionado com sucesso!",
      });
      onSuccess();
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar lançamento.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleCreateNewCategory = () => {
    if (newCategoryName.trim()) {
      createCategoryMutation.mutate(newCategoryName.trim());
    }
  };

  // Reset form quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      setFormData({
        type: '',
        amount: '',
        description: '',
        category: '',
        bank: '',
        date: getCurrentBrazilDate(),
      });
      setShowNewCategoryInput(false);
      setNewCategoryName('');
    }
  }, [isOpen]);

  // Reset categoria quando mudar o tipo
  useEffect(() => {
    if (formData.type) {
      setFormData(prev => ({ ...prev, category: '' }));
    }
  }, [formData.type]);

  const availableCategories = getAvailableCategories();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Lançamento</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Salário, Conta de luz"
              required
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="category">Categoria</Label>
              {formData.type && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                  className="h-6 w-6 p-0"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {showNewCategoryInput && (
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Nome da nova categoria"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateNewCategory()}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateNewCategory}
                  disabled={!newCategoryName.trim()}
                >
                  Criar
                </Button>
              </div>
            )}
            
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              disabled={!formData.type}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="bank">Banco</Label>
            <Select
              value={formData.bank}
              onValueChange={(value) => setFormData({ ...formData, bank: value })}
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
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <Button type="submit">
            Adicionar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewEntryModal;
