import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUnitCategories } from "@/hooks/useUnitCategories";
import type { TransactionType } from "@/constants/default-categories";

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedItemIds: string[];
  userId: string;
}

const BulkEditModal = ({ isOpen, onClose, onSuccess, selectedItemIds, userId }: BulkEditModalProps) => {
  const [businessUnitId, setBusinessUnitId] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [businessUnits, setBusinessUnits] = useState<any[]>([]);
  const [selectedItemsType, setSelectedItemsType] = useState<string>('');
  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const transactionType = useMemo<TransactionType | null>(() => {
    if (selectedItemsType === 'entrada' || selectedItemsType === 'saida') {
      return selectedItemsType;
    }
    return null;
  }, [selectedItemsType]);

  const selectedUnit = useMemo(() => {
    if (!businessUnitId) return null;
    return businessUnits.find(unit => unit.id === businessUnitId) || null;
  }, [businessUnits, businessUnitId]);

  const {
    categories: unitCategories,
    isLoading: isLoadingUnitCategories,
    addCategory: addUnitCategory,
    updateCategory: updateUnitCategory,
    removeCategory: removeUnitCategory,
    isAdding: isAddingCategory,
    isUpdating: isUpdatingCategory,
    isRemoving: isRemovingCategory,
  } = useUnitCategories({
    userId,
    businessUnitId: businessUnitId || null,
    businessUnitName: selectedUnit?.name ?? null,
    type: transactionType,
  });

  const categoryOptions = useMemo(() => unitCategories.map(category => category.name), [unitCategories]);
  const currentEditingCategory = useMemo(
    () => unitCategories.find(category => category.id === editingCategoryId) || null,
    [unitCategories, editingCategoryId]
  );
  const isMutatingCategory = isAddingCategory || isUpdatingCategory || isRemovingCategory;

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

  useEffect(() => {
    if (!transactionType || !businessUnitId) {
      setCategory('');
      return;
    }

    if (category && !categoryOptions.includes(category)) {
      setCategory('');
    }
  }, [transactionType, businessUnitId, categoryOptions, category]);

  useEffect(() => {
    if (!showManageCategories) {
      setEditingCategoryId(null);
      setEditedCategoryName('');
    }
  }, [showManageCategories]);

  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;

    if (!transactionType || !businessUnitId) {
      toast({
        title: "Selecione unidade e tipo",
        description: "Escolha o tipo e a unidade antes de adicionar categorias.",
        variant: "destructive",
      });
      return;
    }

    const exists = categoryOptions.some(
      (option) => option.localeCompare(trimmed, 'pt-BR', { sensitivity: 'accent' }) === 0
    );
    if (exists) {
      toast({
        title: "Categoria já existe",
        description: "Você já possui uma categoria com este nome.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addUnitCategory(trimmed);
      setNewCategory('');
      setShowAddCategory(false);
    } catch (error) {
      // handled by toast
    }
  };

  const handleStartEditCategory = (categoryId: string, name: string) => {
    setEditingCategoryId(categoryId);
    setEditedCategoryName(name);
  };

  const handleSaveEditCategory = async () => {
    if (!editingCategoryId) return;
    const trimmed = editedCategoryName.trim();
    if (!trimmed) return;

    const previousName = currentEditingCategory?.name;
    try {
      await updateUnitCategory({ id: editingCategoryId, name: trimmed });
      if (previousName && category === previousName) {
        setCategory(trimmed);
      }
      setEditingCategoryId(null);
      setEditedCategoryName('');
    } catch (error) {
      // toast handled in hook
    }
  };

  const handleRemoveCategory = async (categoryId: string, name: string) => {
    try {
      await removeUnitCategory(categoryId);
      if (category === name) {
        setCategory('');
      }
    } catch (error) {
      // toast handled in hook
    }
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
    setShowAddCategory(false);
    setShowManageCategories(false);
    setSelectedItemsType('');
    setNewCategory('');
    setEditingCategoryId(null);
    setEditedCategoryName('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const showCategoriesSection = Boolean(transactionType && businessUnitId);

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
                    disabled={isLoadingUnitCategories}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                    disabled={isLoadingUnitCategories}
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
                    disabled={isMutatingCategory || isLoadingUnitCategories}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCategory}
                    disabled={isMutatingCategory || isLoadingUnitCategories}
                  >
                    Adicionar
                  </Button>
                </div>
              )}

              {showManageCategories && (
                <div className="mb-3 p-3 border rounded-lg bg-gray-50 max-h-48 overflow-y-auto">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">Gerenciar Categorias:</p>
                  {isLoadingUnitCategories ? (
                    <p className="text-xs text-gray-500">Carregando categorias...</p>
                  ) : unitCategories.length === 0 ? (
                    <p className="text-xs text-gray-500">Nenhuma categoria cadastrada. Adicione novas usando o botão “+”.</p>
                  ) : (
                    <div className="space-y-2">
                      {unitCategories.map((categoryItem) => (
                        <div key={categoryItem.id} className="flex items-center gap-2 bg-white p-2 rounded border">
                          {editingCategoryId === categoryItem.id ? (
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
                                disabled={isUpdatingCategory}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={handleSaveEditCategory}
                                disabled={isUpdatingCategory}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-sm">{categoryItem.name}</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => handleStartEditCategory(categoryItem.id, categoryItem.name)}
                                disabled={isMutatingCategory}
                              >
                                <Edit2 className="h-3 w-3 text-blue-600" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => handleRemoveCategory(categoryItem.id, categoryItem.name)}
                                disabled={isMutatingCategory}
                              >
                                <Trash2 className="h-3 w-3 text-red-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Select
                value={category}
                onValueChange={setCategory}
                required
                disabled={isLoadingUnitCategories || categoryOptions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingUnitCategories ? "Carregando categorias..." : "Selecione uma categoria"} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.length === 0 ? (
                    <SelectItem value="__sem_categorias" disabled>
                      Nenhuma categoria disponível
                    </SelectItem>
                  ) : (
                    categoryOptions.map((catName) => (
                      <SelectItem key={catName} value={catName}>
                        {catName}
                      </SelectItem>
                    ))
                  )}
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
