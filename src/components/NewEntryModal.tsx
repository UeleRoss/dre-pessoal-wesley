
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

interface NewEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NewEntryModal = ({ isOpen, onClose, onSuccess }: NewEntryModalProps) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'entrada',
    description: '',
    amount: '',
    category: '',
    bank: 'CONTA SIMPLES'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const banks = ['CONTA SIMPLES', 'BRADESCO', 'C6 BANK', 'ASAAS', 'NOMAD'];
  
  // Categorias fixas definidas pelo usuário
  const fixedCategories = [
    'Carro',
    'Comida',
    'Contas Mensais',
    'Entre bancos',
    'Escritório',
    'Estudos',
    'Go On Outdoor',
    'Imposto',
    'Investimentos',
    'Lazer e ócio',
    'Pro-Labore',
    'Vida esportiva',
    'Anúncios Online',
    'Itens Físicos'
  ];

  // Busca categorias personalizadas do usuário
  const { data: userCategories = [] } = useQuery({
    queryKey: ['user-categories'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('financial_items')
        .select('category')
        .eq('user_id', user.id);
      
      if (error) throw error;
      const dbCategories = [...new Set(data.map(item => item.category))];
      
      // Retorna apenas categorias que não estão nas fixas
      return dbCategories.filter(cat => !fixedCategories.includes(cat));
    },
    enabled: isOpen
  });

  // Combina categorias fixas com categorias personalizadas
  const allCategories = [...fixedCategories, ...userCategories].sort();

  const types = [
    { value: 'entrada', label: 'Entrada' },
    { value: 'saida', label: 'Saída' },
    { value: 'transferencia', label: 'Transferência' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('financial_items')
        .insert({
          user_id: user.id,
          date: formData.date,
          type: formData.type,
          description: formData.description,
          amount: parseFloat(formData.amount),
          category: formData.category,
          bank: formData.bank
        });

      if (error) throw error;

      toast({
        title: "Lançamento criado!",
        description: "O lançamento foi adicionado com sucesso.",
      });

      // Invalida as queries para atualizar as listas
      queryClient.invalidateQueries({ queryKey: ['user-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });

      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'entrada',
        description: '',
        amount: '',
        category: '',
        bank: 'CONTA SIMPLES'
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Novo Lançamento</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Data</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full p-2 border rounded-lg"
                required
              >
                {types.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Valor</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full p-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {allCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Banco</label>
              <select
                value={formData.bank}
                onChange={(e) => setFormData({...formData, bank: e.target.value})}
                className="w-full p-2 border rounded-lg"
                required
              >
                {banks.map(bank => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Lançamento"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewEntryModal;
