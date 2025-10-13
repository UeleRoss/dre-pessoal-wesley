import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getCurrentBrazilDate } from "@/utils/dateUtils";
import { X, Plus, Trash2, Edit2, Check } from "lucide-react";

interface NewEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Categorias por tipo (entrada/saída) e unidade de negócio
const CATEGORIES_BY_TYPE_AND_UNIT: Record<string, Record<string, string[]>> = {
  'saida': {
    'Apartamento': ['Condomínio', 'Aluguel', 'Luz', 'Água', 'Internet', 'Gás', 'IPTU', 'Reformas', 'Manutenção', 'Móveis'],
    'Escritório': ['Aluguel', 'Luz', 'Internet', 'Material de Escritório', 'Limpeza', 'Equipamentos', 'Software', 'Telefone'],
    'Viagens e Lazer': ['Passagens', 'Hospedagem', 'Alimentação', 'Passeios', 'Ingressos', 'Souvenirs', 'Transporte'],
    'Vida Esportiva': ['Academia', 'Personal Trainer', 'Equipamentos', 'Roupas Esportivas', 'Suplementos', 'Competições'],
    'Compras Pessoais': ['Roupas', 'Eletrônicos', 'Livros', 'Acessórios', 'Presentes', 'Cosméticos', 'Farmácia'],
    'Go On Outdoor': ['Despesas Operacionais', 'Marketing', 'Fornecedores', 'Equipamentos', 'Logística', 'Taxas'],
    'Carro': ['Combustível', 'Manutenção', 'Seguro', 'IPVA', 'Estacionamento', 'Multas', 'Lavagem', 'Pedágio'],
    'Comida': ['Supermercado', 'Restaurante', 'Delivery', 'Padaria', 'Feira', 'Açougue', 'Bebidas'],
  },
  'entrada': {
    'Apartamento': ['Aluguel Recebido', 'Venda de Móveis', 'Reembolso de Despesas', 'Devolução de Caução'],
    'Escritório': ['Receitas de Serviços', 'Consultorias', 'Reembolsos', 'Venda de Equipamentos'],
    'Viagens e Lazer': ['Reembolsos', 'Prêmios', 'Cashback'],
    'Vida Esportiva': ['Prêmios', 'Patrocínios', 'Venda de Equipamentos', 'Reembolsos'],
    'Compras Pessoais': ['Vendas', 'Reembolsos', 'Devoluções', 'Cashback'],
    'Go On Outdoor': ['Vendas Online', 'Vendas Presenciais', 'Parcerias', 'Comissões', 'Patrocínios', 'Eventos'],
    'Carro': ['Venda do Veículo', 'Aluguel do Veículo', 'Reembolso de Combustível', 'Indenização de Seguro'],
    'Comida': ['Venda de Produtos', 'Reembolsos'],
  },
};

const NewEntryModal = ({ isOpen, onClose, onSuccess }: NewEntryModalProps) => {
  const [formData, setFormData] = useState({
    type: '',
    amount: '',
    description: '',
    category: '',
    date: getCurrentBrazilDate(),
    business_unit_id: null as string | null,
  });
  const [user, setUser] = useState<any>(null);
  const [businessUnits, setBusinessUnits] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Erro ao buscar usuário:", error);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchBusinessUnits = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('business_units')
          .select('*')
          .eq('user_id', user.id)
          .order('name');
        if (!error && data) {
          setBusinessUnits(data);
        }
      } catch (error) {
        console.error('Erro ao buscar unidades:', error);
      }
    };
    if (isOpen && user?.id) {
      fetchBusinessUnits();
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        type: '',
        amount: '',
        description: '',
        category: '',
        date: getCurrentBrazilDate(),
        business_unit_id: null,
      });
      setCategories([]);
      setNewCategory('');
      setShowAddCategory(false);
      setShowManageCategories(false);
      setEditingCategory(null);
    }
  }, [isOpen]);

  // Atualizar categorias quando mudar tipo OU unidade
  useEffect(() => {
    if (formData.type && formData.business_unit_id) {
      const selectedUnit = businessUnits.find(u => u.id === formData.business_unit_id);
      if (selectedUnit) {
        const categoriesForTypeAndUnit = CATEGORIES_BY_TYPE_AND_UNIT[formData.type]?.[selectedUnit.name] || [];
        setCategories([...categoriesForTypeAndUnit]);
        setFormData(prev => ({ ...prev, category: '' }));
      }
    } else {
      setCategories([]);
    }
  }, [formData.type, formData.business_unit_id, businessUnits]);

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory('');
      setShowAddCategory(false);
      toast({
        title: "Categoria adicionada",
        description: `"${newCategory}" foi adicionada.`,
      });
    }
  };

  const handleStartEditCategory = (category: string) => {
    setEditingCategory(category);
    setEditedCategoryName(category);
  };

  const handleSaveEditCategory = () => {
    if (editedCategoryName.trim() && editingCategory) {
      const updatedCategories = categories.map(cat =>
        cat === editingCategory ? editedCategoryName.trim() : cat
      );
      setCategories(updatedCategories);

      if (formData.category === editingCategory) {
        setFormData({ ...formData, category: editedCategoryName.trim() });
      }

      setEditingCategory(null);
      setEditedCategoryName('');
      toast({
        title: "Categoria editada",
        description: `Categoria atualizada com sucesso.`,
      });
    }
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    setCategories(categories.filter(c => c !== categoryToRemove));
    if (formData.category === categoryToRemove) {
      setFormData({ ...formData, category: '' });
    }
    toast({
      title: "Categoria removida",
      description: `"${categoryToRemove}" foi removida.`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast({ title: "Erro", description: "Usuário não autenticado", variant: "destructive" });
      return;
    }

    if (!formData.business_unit_id) {
      toast({ title: "Erro", description: "Selecione uma unidade de negócio", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('financial_items').insert([{
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        category: formData.category,
        bank: 'N/A',
        date: formData.date,
        business_unit_id: formData.business_unit_id,
        user_id: user.id,
      }]);
      if (error) throw error;
      toast({ title: "Sucesso", description: "Lançamento criado!" });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erro:", error);
      toast({ title: "Erro", description: error.message || "Erro ao criar lançamento.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const showCategories = formData.type && formData.business_unit_id && categories.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Novo Lançamento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label>Tipo *</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value, category: '' })} required>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Unidade de Negócio *</Label>
            <Select
              value={formData.business_unit_id || 'none'}
              onValueChange={(value) => setFormData({ ...formData, business_unit_id: value === 'none' ? null : value, category: '' })}
              required
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>Selecione uma unidade</SelectItem>
                {businessUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: unit.color }} />
                      {unit.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showCategories && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Categoria *</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowManageCategories(!showManageCategories)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {showAddCategory && (
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Nova categoria"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                  />
                  <Button type="button" size="sm" onClick={handleAddCategory}>
                    Adicionar
                  </Button>
                </div>
              )}

              {showManageCategories && (
                <div className="mb-3 p-3 border rounded-lg bg-gray-50 max-h-48 overflow-y-auto">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">Gerenciar Categorias:</p>
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <div key={cat} className="flex items-center gap-2 bg-white p-2 rounded border">
                        {editingCategory === cat ? (
                          <>
                            <Input
                              value={editedCategoryName}
                              onChange={(e) => setEditedCategoryName(e.target.value)}
                              className="flex-1 h-8"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveEditCategory();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={handleSaveEditCategory}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm">{cat}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleStartEditCategory(cat)}
                            >
                              <Edit2 className="h-3 w-3 text-blue-600" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleRemoveCategory(cat)}
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })} required>
                <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Valor *</Label>
            <Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" required />
          </div>

          <div>
            <Label>Descrição *</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Ex: Conta de luz de Janeiro" required />
          </div>

          <div>
            <Label>Data *</Label>
            <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewEntryModal;
