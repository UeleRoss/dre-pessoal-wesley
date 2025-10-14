
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, Check } from "lucide-react";
import { useUnitCategories } from "@/hooks/useUnitCategories";
import type { TransactionType } from "@/constants/default-categories";
import type { BusinessUnit } from "@/types/business-unit";

interface FinancialItem {
  id: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  bank: string;
  date: string;
  business_unit_id?: string | null;
}

interface EditEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: FinancialItem | null;
  userId: string;
}

const EditEntryModal = ({ isOpen, onClose, onSuccess, item, userId }: EditEntryModalProps) => {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [businessUnitId, setBusinessUnitId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const { toast } = useToast();

  const transactionType = useMemo<TransactionType | null>(() => {
    if (type === 'entrada' || type === 'saida') {
      return type;
    }
    return null;
  }, [type]);

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
    businessUnitId,
    businessUnitName: selectedUnit?.name ?? null,
    type: transactionType,
  });

  const categoryOptions = useMemo(() => {
    const options = unitCategories.map(category => category.name);
    if (category && !options.includes(category)) {
      options.push(category);
    }
    return options;
  }, [unitCategories, category]);

  const currentEditingCategory = useMemo(
    () => unitCategories.find(categoryItem => categoryItem.id === editingCategoryId) || null,
    [unitCategories, editingCategoryId]
  );

  const showCategoriesSection = Boolean(transactionType && businessUnitId);
  const isMutatingCategory = isAddingCategory || isUpdatingCategory || isRemovingCategory;

  useEffect(() => {
    if (item) {
      setDescription(item.description);
      setAmount(item.amount.toString());
      setType(item.type);
      setCategory(item.category);
      setBusinessUnitId(item.business_unit_id || null);
      setDate(item.date);
    }
  }, [item]);

  useEffect(() => {
    const fetchBusinessUnits = async () => {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from('business_units')
          .select('*')
          .eq('user_id', userId)
          .order('name');
        if (error) throw error;
        setBusinessUnits(data ?? []);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar unidades';
        console.error('Erro ao buscar unidades:', message);
        toast({
          title: "Erro ao carregar unidades",
          description: message,
          variant: "destructive",
        });
      }
    };
    if (isOpen && userId) {
      fetchBusinessUnits();
    }
  }, [isOpen, userId, toast]);

  useEffect(() => {
    if (!showCategoriesSection) {
      setCategory('');
      return;
    }

    if (category && !categoryOptions.includes(category)) {
      setCategory('');
    }
  }, [showCategoriesSection, categoryOptions, category]);

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

    const originalName = currentEditingCategory?.name;
    try {
      await updateUnitCategory({ id: editingCategoryId, name: trimmed });
      if (originalName && category === originalName) {
        setCategory(trimmed);
      }
      setEditingCategoryId(null);
      setEditedCategoryName('');
    } catch (error) {
      // handled by toast
    }
  };

  const handleRemoveCategory = async (categoryId: string, name: string) => {
    try {
      await removeUnitCategory(categoryId);
      if (category === name) {
        setCategory('');
      }
    } catch (error) {
      // handled by toast
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!item) return;

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

    const { error } = await supabase
      .from('financial_items')
      .update({
        description,
        amount: parseFloat(amount),
        type,
        category,
        business_unit_id: businessUnitId,
        date,
        needs_review: false, // Remove flag de revisão ao salvar
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao editar lançamento",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Lançamento editado com sucesso",
      });
      onSuccess();
    }
  };

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setType("");
    setCategory("");
    setBusinessUnitId(null);
    setDate("");
    setShowAddCategory(false);
    setShowManageCategories(false);
    setEditingCategoryId(null);
    setEditedCategoryName('');
    setNewCategory('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Lançamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={(value) => {
              setType(value);
              setCategory('');
            }} required>
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
            <Label htmlFor="business_unit">Unidade de Negócio</Label>
            <Select
              value={businessUnitId || 'none'}
              onValueChange={(value) => {
                setBusinessUnitId(value === 'none' ? null : value);
                setCategory('');
              }}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma unidade" />
              </SelectTrigger>
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

          <div>
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Conta de luz de Janeiro"
              required
            />
          </div>

          <div>
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEntryModal;
