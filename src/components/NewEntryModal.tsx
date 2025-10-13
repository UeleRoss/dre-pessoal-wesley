import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { getCurrentBrazilDate } from "@/utils/dateUtils";
import { useCreditCards } from "@/hooks/useCreditCards";
import { X, Plus, Trash2, Edit2, Check, CreditCard, Repeat, Calendar } from "lucide-react";
import { useUnitCategories } from "@/hooks/useUnitCategories";
import type { TransactionType } from "@/constants/default-categories";

interface NewEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NewEntryModal = ({ isOpen, onClose, onSuccess }: NewEntryModalProps) => {
  const [formData, setFormData] = useState({
    type: '',
    amount: '',
    description: '',
    category: '',
    date: getCurrentBrazilDate(),
    business_unit_id: null as string | null,
    is_recurring: false,
    credit_card: '',
    is_installment: false,
    total_installments: 1,
  });
  const [user, setUser] = useState<any>(null);
  const [businessUnits, setBusinessUnits] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);

  const { toast } = useToast();
  const { creditCards } = useCreditCards(user?.id || '');
  const transactionType = useMemo<TransactionType | null>(() => {
    if (formData.type === 'entrada' || formData.type === 'saida') {
      return formData.type;
    }
    return null;
  }, [formData.type]);

  const selectedUnit = useMemo(() => {
    if (!formData.business_unit_id) return null;
    return businessUnits.find(unit => unit.id === formData.business_unit_id) || null;
  }, [businessUnits, formData.business_unit_id]);

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
    userId: user?.id,
    businessUnitId: formData.business_unit_id,
    businessUnitName: selectedUnit?.name ?? null,
    type: transactionType,
  });

  const categoryOptions = useMemo(() => {
    const options = unitCategories.map(category => category.name);
    if (formData.category && !options.includes(formData.category)) {
      options.push(formData.category);
    }
    return options;
  }, [unitCategories, formData.category]);

  const currentEditingCategory = useMemo(
    () => unitCategories.find(category => category.id === editingCategoryId) || null,
    [unitCategories, editingCategoryId]
  );
  const showCategories = Boolean(transactionType && formData.business_unit_id);
  const isMutatingCategory = isAddingCategory || isUpdatingCategory || isRemovingCategory;

  useEffect(() => {
    if (!showCategories) {
      setFormData((prev) => ({ ...prev, category: '' }));
      return;
    }

    if (formData.category && !categoryOptions.includes(formData.category)) {
      setFormData((prev) => ({ ...prev, category: '' }));
    }
  }, [showCategories, categoryOptions, formData.category]);

  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (!transactionType || !formData.business_unit_id) {
      toast({
        title: "Selecione unidade e tipo",
        description: "Escolha o tipo e a unidade antes de adicionar categorias.",
        variant: "destructive",
      });
      return;
    }

    const exists = categoryOptions.some(
      (option) => option.localeCompare(trimmed, "pt-BR", { sensitivity: "accent" }) === 0
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
      // erros exibidos pelo hook
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

    const oldName = currentEditingCategory?.name;
    try {
      await updateUnitCategory({ id: editingCategoryId, name: trimmed });
      if (oldName && formData.category === oldName) {
        setFormData((prev) => ({ ...prev, category: trimmed }));
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
      if (formData.category === name) {
        setFormData((prev) => ({ ...prev, category: '' }));
      }
    } catch (error) {
      // handled by toast
    }
  };

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
        is_recurring: false,
        credit_card: '',
        is_installment: false,
        total_installments: 1,
      });
      setNewCategory('');
      setShowAddCategory(false);
      setShowManageCategories(false);
      setEditingCategoryId(null);
      setEditedCategoryName('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!showManageCategories) {
      setEditingCategoryId(null);
      setEditedCategoryName('');
    }
  }, [showManageCategories]);

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

    if (!formData.category) {
      toast({ title: "Erro", description: "Selecione uma categoria", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (formData.is_installment) {
        // === COMPRA PARCELADA ===
        const { error } = await supabase.rpc('create_installment_purchase', {
          p_user_id: user.id,
          p_type: formData.type,
          p_total_amount: parseFloat(formData.amount),
          p_description: formData.description,
          p_category: formData.category,
          p_credit_card: formData.credit_card || null,
          p_business_unit_id: formData.business_unit_id,
          p_start_date: formData.date,
          p_total_installments: formData.total_installments
        });

        if (error) throw error;

        toast({
          title: "Parcelas criadas!",
          description: `${formData.total_installments} parcelas adicionadas com sucesso`
        });

      } else if (formData.is_recurring) {
        // === CONTA RECORRENTE ===
        // 1. Criar template
        const { data: template, error: templateError } = await supabase
          .from('recurring_templates')
          .insert([{
            type: formData.type,
            amount: parseFloat(formData.amount),
            description: formData.description,
            category: formData.category,
            business_unit_id: formData.business_unit_id,
            credit_card: formData.credit_card || null,
            user_id: user.id,
            is_active: true,
          }])
          .select()
          .single();

        if (templateError) throw templateError;

        // 2. Criar primeiro lançamento (aprovado)
        const { error } = await supabase.from('financial_items').insert([{
          type: formData.type,
          amount: parseFloat(formData.amount),
          description: formData.description,
          category: formData.category,
          bank: formData.credit_card || 'N/A',
          date: formData.date,
          business_unit_id: formData.business_unit_id,
          user_id: user.id,
          is_recurring: true,
          recurring_template_id: template.id,
          recurring_status: 'approved',
          credit_card: formData.credit_card || null,
        }]);

        if (error) throw error;

        toast({
          title: "Conta recorrente criada!",
          description: "Será gerada automaticamente nos próximos meses"
        });

      } else {
        // === LANÇAMENTO NORMAL ===
        const { error } = await supabase.from('financial_items').insert([{
          type: formData.type,
          amount: parseFloat(formData.amount),
          description: formData.description,
          category: formData.category,
          bank: formData.credit_card || 'N/A',
          date: formData.date,
          business_unit_id: formData.business_unit_id,
          credit_card: formData.credit_card || null,
          user_id: user.id,
        }]);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Lançamento criado!" });
      }

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
                      {unitCategories.map((category) => (
                        <div key={category.id} className="flex items-center gap-2 bg-white p-2 rounded border">
                          {editingCategoryId === category.id ? (
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
                              <span className="flex-1 text-sm">{category.name}</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => handleStartEditCategory(category.id, category.name)}
                                disabled={isMutatingCategory}
                              >
                                <Edit2 className="h-3 w-3 text-blue-600" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => handleRemoveCategory(category.id, category.name)}
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
                value={formData.category}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
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
                    categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))
                  )}
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

          {/* === SEÇÃO: TIPO DE LANÇAMENTO === */}
          {formData.type === 'saida' && (
            <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-sm text-blue-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Tipo de Lançamento
              </h3>

              {/* Checkbox: Conta Recorrente */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => {
                    setFormData({
                      ...formData,
                      is_recurring: !!checked,
                      is_installment: checked ? false : formData.is_installment
                    })
                  }}
                  disabled={formData.is_installment}
                />
                <Label htmlFor="is_recurring" className="flex items-center gap-2 cursor-pointer text-sm">
                  <Repeat className="h-4 w-4 text-blue-600" />
                  Conta Recorrente (repete todo mês)
                </Label>
              </div>

              {/* Checkbox: Compra Parcelada */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_installment"
                  checked={formData.is_installment}
                  onCheckedChange={(checked) => {
                    setFormData({
                      ...formData,
                      is_installment: !!checked,
                      is_recurring: checked ? false : formData.is_recurring
                    })
                  }}
                  disabled={formData.is_recurring}
                />
                <Label htmlFor="is_installment" className="flex items-center gap-2 cursor-pointer text-sm">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  Compra Parcelada
                </Label>
              </div>

              {/* Se parcelado: quantidade de parcelas */}
              {formData.is_installment && (
                <div>
                  <Label>Quantidade de Parcelas</Label>
                  <Select
                    value={String(formData.total_installments)}
                    onValueChange={(value) => setFormData({ ...formData, total_installments: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map(num => (
                        <SelectItem key={num} value={String(num)}>
                          {num}x de R$ {formData.amount ? (parseFloat(formData.amount) / num).toFixed(2) : '0.00'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* === SEÇÃO: CARTÃO DE CRÉDITO === */}
          {(formData.is_recurring || formData.is_installment || formData.type === 'saida') && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Cartão de Crédito (opcional)
              </Label>
              <Select
                value={formData.credit_card || 'none'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    credit_card: value === 'none' ? '' : value
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cartão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (pagamento direto)</SelectItem>
                  {creditCards.map((card) => (
                    <SelectItem key={card.id} value={card.name}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                        {card.name}
                        <span className="text-xs text-gray-500">
                          (Venc: dia {card.due_day})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {creditCards.length === 0 && (
                <p className="text-xs text-gray-500">
                  Nenhum cartão cadastrado. Adicione cartões na página de Cartões.
                </p>
              )}
            </div>
          )}

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
