import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedItemIds: string[];
  userId: string;
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

const BulkEditModal = ({ isOpen, onClose, onSuccess, selectedItemIds, userId }: BulkEditModalProps) => {
  const [businessUnitId, setBusinessUnitId] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [businessUnits, setBusinessUnits] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedItemsType, setSelectedItemsType] = useState<string>('');
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchBusinessUnits = async () => {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from('business_units')
          .select('*')
          .eq('user_id', userId)
          .order('name');
        if (!error && data) {
          setBusinessUnits(data);
        }
      } catch (error) {
        console.error('Erro ao buscar unidades:', error);
      }
    };

    const fetchSelectedItemsType = async () => {
      if (selectedItemIds.length === 0) return;
      try {
        const { data, error } = await supabase
          .from('financial_items')
          .select('type')
          .in('id', selectedItemIds)
          .limit(1)
          .single();

        if (!error && data) {
          setSelectedItemsType(data.type);
        }
      } catch (error) {
        console.error('Erro ao buscar tipo dos itens:', error);
      }
    };

    if (isOpen && userId) {
      fetchBusinessUnits();
      fetchSelectedItemsType();
    }
  }, [isOpen, userId, selectedItemIds]);

  // Atualizar categorias quando mudar a unidade
  useEffect(() => {
    if (selectedItemsType && businessUnitId) {
      const selectedUnit = businessUnits.find(u => u.id === businessUnitId);
      if (selectedUnit) {
        const categoriesForTypeAndUnit = CATEGORIES_BY_TYPE_AND_UNIT[selectedItemsType]?.[selectedUnit.name] || [];
        setCategories([...categoriesForTypeAndUnit]);
        setCategory('');
      }
    } else {
      setCategories([]);
    }
  }, [selectedItemsType, businessUnitId, businessUnits]);

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

      if (category === editingCategory) {
        setCategory(editedCategoryName.trim());
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
    if (category === categoryToRemove) {
      setCategory('');
    }
    toast({
      title: "Categoria removida",
      description: `"${categoryToRemove}" foi removida.`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessUnitId) {
      toast({
        title: "Erro",
        description: "Selecione uma unidade de negócio",
        variant: "destructive",
      });
      return;
    }

    if (!category) {
      toast({
        title: "Erro",
        description: "Selecione uma categoria",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('financial_items')
        .update({
          business_unit_id: businessUnitId,
          category: category,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedItemIds);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${selectedItemIds.length} lançamento(s) atualizado(s) com sucesso`,
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Erro ao atualizar lançamentos:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar lançamentos",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setBusinessUnitId('');
    setCategory('');
    setCategories([]);
    setShowAddCategory(false);
    setShowManageCategories(false);
    setSelectedItemsType('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const showCategoriesSection = businessUnitId && categories.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {selectedItemIds.length} Lançamento(s)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>Atenção:</strong> Você está editando {selectedItemIds.length} lançamento(s) de uma vez.
            As alterações serão aplicadas a todos os itens selecionados.
          </div>

          <div>
            <Label htmlFor="business_unit">Unidade de Negócio</Label>
            <Select
              value={businessUnitId}
              onValueChange={(value) => {
                setBusinessUnitId(value);
                setCategory('');
              }}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma unidade" />
              </SelectTrigger>
              <SelectContent>
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

          {showCategoriesSection && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Categoria</Label>
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

              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
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

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkEditModal;
