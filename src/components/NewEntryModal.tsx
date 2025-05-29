
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery } from "@tanstack/react-query";

// Categorias fixas
const FIXED_CATEGORIES = [
  "Carro",
  "Comida", 
  "Contas Mensais",
  "Entre bancos",
  "Escritório",
  "Estudos",
  "Go On Outdoor",
  "Imposto",
  "Investimentos",
  "Lazer e ócio",
  "Pro-Labore",
  "Vida esportiva",
  "Anúncios Online",
  "Itens Físicos"
];

const BANKS = ['CONTA SIMPLES', 'BRADESCO', 'C6 BANK', 'ASAAS', 'NOMAD'];

interface NewEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NewEntryModal = ({ isOpen, onClose, onSuccess }: NewEntryModalProps) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    type: 'entrada' as 'entrada' | 'saida',
    category: '',
    bank: '',
  });

  const { toast } = useToast();

  // Buscar categorias personalizadas
  const { data: customCategories = [] } = useQuery({
    queryKey: ['custom-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Combinar categorias fixas com personalizadas
  const allCategories = [
    ...FIXED_CATEGORIES,
    ...customCategories.map(cat => cat.name)
  ].sort();

  const createEntryMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('financial_items')
        .insert([{
          ...data,
          amount: parseFloat(data.amount),
          user_id: user.data.user.id
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Lançamento criado",
        description: "Novo lançamento adicionado com sucesso!",
      });
      onSuccess();
      onClose();
      resetForm();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar lançamento.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      description: '',
      type: 'entrada',
      category: '',
      bank: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description || !formData.category || !formData.bank) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    createEntryMutation.mutate(formData);
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lançamento</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'entrada' | 'saida') => setFormData({ ...formData, type: value })}
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
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Descrição do lançamento"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                {allCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
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

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createEntryMutation.isPending}
              className="flex-1"
            >
              {createEntryMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewEntryModal;
