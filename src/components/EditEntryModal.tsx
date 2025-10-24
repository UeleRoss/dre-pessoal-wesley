
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit2, Check, CreditCard as CreditCardIcon, Repeat, Calendar } from "lucide-react";
import { useUnitCategories } from "@/hooks/useUnitCategories";
import type { TransactionType } from "@/constants/default-categories";
import type { BusinessUnit } from "@/types/business-unit";
import { useCreditCards } from "@/hooks/useCreditCards";
import { getInvoiceInfo } from "@/utils/creditCardUtils";

interface FinancialItem {
  id: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  bank: string;
  date: string;
  business_unit_id?: string | null;
  user_id?: string;
  is_recurring?: boolean;
  recurring_template_id?: string | null;
  recurring_status?: 'pending' | 'approved' | 'skipped' | null;
  credit_card?: string | null;
  is_installment?: boolean;
  total_installments?: number | null;
  installment_group_id?: string | null;
  installment_number?: number | null;
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
  const [creditCard, setCreditCard] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState(1);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const { toast } = useToast();
  const { creditCards, isLoading: isLoadingCreditCards } = useCreditCards(userId);

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

  const selectedCreditCard = useMemo(() => {
    if (!creditCard) return null;
    return creditCards.find(card => card.name === creditCard) || null;
  }, [creditCards, creditCard]);

  const invoiceInfo = useMemo(() => {
    if (!selectedCreditCard || !date) {
      return null;
    }

    try {
      return getInvoiceInfo(date, selectedCreditCard.closing_day, selectedCreditCard.due_day);
    } catch {
      return null;
    }
  }, [selectedCreditCard, date]);

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
      setCreditCard(item.credit_card || "");
      const isExpense = item.type === 'saida';
      setIsRecurring(isExpense ? !!item.is_recurring : false);
      setIsInstallment(isExpense ? !!item.is_installment : false);
      setTotalInstallments(item.total_installments || 1);
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
      return;
    }

    if (isLoadingUnitCategories) {
      return;
    }

    if (category && categoryOptions.length > 0 && !categoryOptions.includes(category)) {
      setCategory('');
    }
  }, [showCategoriesSection, isLoadingUnitCategories, categoryOptions, category]);

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

    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount)) {
      toast({
        title: "Erro",
        description: "Informe um valor numérico válido",
        variant: "destructive",
      });
      return;
    }

    const allowAdvancedOptions = type === 'saida';
    const applyRecurring = allowAdvancedOptions && isRecurring;
    const applyInstallment = allowAdvancedOptions && isInstallment;

    if (!date) {
      toast({
        title: "Erro",
        description: "Informe a data da compra",
        variant: "destructive",
      });
      return;
    }

    if (applyRecurring && !userId) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar o usuário para criar a recorrência.",
        variant: "destructive",
      });
      return;
    }

    const transactionDate = selectedCreditCard && invoiceInfo?.referenceMonth
      ? invoiceInfo.referenceMonth
      : date;

    const updates: Record<string, any> = {
      description,
      amount: parsedAmount,
      type,
      category,
      business_unit_id: businessUnitId,
      date: transactionDate,
      needs_review: false,
      updated_at: new Date().toISOString(),
      credit_card: allowAdvancedOptions && creditCard ? creditCard : null,
    };

    // === Contas Recorrentes ===
    if (applyRecurring) {
      let templateId = item.recurring_template_id || null;
      const templatePayload = {
        type,
        amount: parsedAmount,
        description,
        category,
        business_unit_id: businessUnitId,
        credit_card: updates.credit_card,
        is_active: true,
      };

      if (item.is_recurring && item.recurring_template_id) {
        const { error: updateTemplateError } = await supabase
          .from('recurring_templates')
          .update(templatePayload)
          .eq('id', item.recurring_template_id);

        if (updateTemplateError) {
          console.error('Erro ao atualizar template recorrente:', updateTemplateError);
          toast({
            title: "Erro ao atualizar recorrência",
            description: updateTemplateError.message,
            variant: "destructive",
          });
          return;
        }
        templateId = item.recurring_template_id;
      } else {
        const { data: template, error: templateError } = await supabase
          .from('recurring_templates')
          .insert([{
            ...templatePayload,
            user_id: userId,
          }])
          .select()
          .single();

        if (templateError) {
          console.error('Erro ao criar template recorrente:', templateError);
          toast({
            title: "Erro ao criar recorrência",
            description: templateError.message,
            variant: "destructive",
          });
          return;
        }
        templateId = template?.id || null;
      }

      updates.is_recurring = true;
      updates.recurring_template_id = templateId;
      updates.recurring_status = item.recurring_status ?? 'approved';
    } else {
      updates.is_recurring = false;
      updates.recurring_template_id = null;
      updates.recurring_status = null;

      if (item.is_recurring && item.recurring_template_id) {
        const { error: deactivateTemplateError } = await supabase
          .from('recurring_templates')
          .update({ is_active: false })
          .eq('id', item.recurring_template_id);

        if (deactivateTemplateError) {
          console.error('Erro ao desativar template recorrente:', deactivateTemplateError);
          toast({
            title: "Erro ao desativar recorrência",
            description: deactivateTemplateError.message,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // === Parcelamento ===
    if (applyInstallment) {
      const ensuredInstallments = Math.max(2, totalInstallments || 2);
      updates.is_installment = true;
      updates.total_installments = ensuredInstallments;
      updates.installment_group_id = item.installment_group_id || item.id;
      updates.installment_number = item.installment_number || 1;
    } else {
      updates.is_installment = false;
      updates.total_installments = null;
      updates.installment_group_id = null;
      updates.installment_number = null;
    }

    const { error } = await supabase
      .from('financial_items')
      .update(updates)
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
    setCreditCard("");
    setIsRecurring(false);
    setIsInstallment(false);
    setTotalInstallments(1);
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
              if (value !== 'saida') {
                setIsRecurring(false);
                setIsInstallment(false);
                setCreditCard('');
              }
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

          {type === 'saida' && (
            <>
              <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-sm text-blue-900 flex items-center gap-2">
                  <CreditCardIcon className="h-4 w-4" />
                  Tipo de Lançamento
                </h3>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-is-recurring"
                    checked={isRecurring}
                    onCheckedChange={(checked) => {
                      const value = !!checked;
                      setIsRecurring(value);
                      if (value) {
                        setIsInstallment(false);
                      }
                    }}
                    disabled={isInstallment}
                  />
                  <Label htmlFor="edit-is-recurring" className="flex items-center gap-2 cursor-pointer text-sm">
                    <Repeat className="h-4 w-4 text-blue-600" />
                    Conta Recorrente (repete todo mês)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-is-installment"
                    checked={isInstallment}
                    onCheckedChange={(checked) => {
                      const value = !!checked;
                      setIsInstallment(value);
                      if (value) {
                        setIsRecurring(false);
                        setTotalInstallments((prev) => Math.max(prev, 2));
                      }
                    }}
                    disabled={isRecurring}
                  />
                  <Label htmlFor="edit-is-installment" className="flex items-center gap-2 cursor-pointer text-sm">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    Compra Parcelada
                  </Label>
                </div>

                {isInstallment && (
                  <div>
                    <Label>Quantidade de Parcelas</Label>
                    <Select
                      value={String(totalInstallments)}
                      onValueChange={(value) => {
                        const parsed = parseInt(value, 10);
                        setTotalInstallments(Number.isNaN(parsed) ? 2 : parsed);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((num) => (
                          <SelectItem key={num} value={String(num)}>
                            {num}x de R$ {amount ? (parseFloat(amount) / num).toFixed(2) : '0.00'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CreditCardIcon className="h-4 w-4" />
                  Cartão de Crédito (opcional)
                </Label>
                <Select
                  value={creditCard || 'none'}
                  onValueChange={(value) => setCreditCard(value === 'none' ? '' : value)}
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
                {!isLoadingCreditCards && creditCards.length === 0 && (
                  <p className="text-xs text-gray-500">
                    Nenhum cartão cadastrado. Adicione cartões na página de Cartões.
                  </p>
                )}
                {selectedCreditCard && (
                  <div className="rounded-md border p-3 text-sm border-blue-200 bg-blue-50 text-blue-700">
                    {invoiceInfo ? (
                      <p>
                        Compra registrada como crédito. Fatura prevista:{" "}
                        <span className="font-semibold">{invoiceInfo.invoiceMonth}</span>{" "}
                        (vence em {invoiceInfo.dueDateFormatted}).
                      </p>
                    ) : (
                      <p>Selecione a data da compra para calcular a fatura prevista.</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <div>
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            {selectedCreditCard && (
              <p className="text-xs text-blue-600 mt-1">
                Esta é a data real da compra. Usaremos a fatura correta ao salvar.
              </p>
            )}
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
