import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  fetchRecurringBills,
  createRecurringBill,
  updateRecurringBill,
  deleteRecurringBill,
  fetchRecurringBillInstances,
  upsertRecurringBillInstance,
  type RecurringBill,
  type RecurringBillInstance,
} from "@/services/api";
import { Trash2, Edit, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Contas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date();

  const [selectedMonth, setSelectedMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    value: '',
    due_date: '1',
    category: '',
    bank: '',
    is_installment: false,
    total_installments: '',
    start_month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
  });

  const monthReference = `${selectedMonth}-01`;

  // Queries
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['recurring-bills'],
    queryFn: fetchRecurringBills,
  });

  const { data: instances = [] } = useQuery({
    queryKey: ['recurring-bill-instances', monthReference],
    queryFn: () => fetchRecurringBillInstances(monthReference),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createRecurringBill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
      toast({ title: 'Conta criada com sucesso!' });
      handleCloseForm();
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar conta', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecurringBill> }) => updateRecurringBill(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
      toast({ title: 'Conta atualizada!' });
      handleCloseForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecurringBill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
      toast({ title: 'Conta deletada!' });
    },
  });

  const togglePaidMutation = useMutation({
    mutationFn: ({ billId, isPaid }: { billId: string; isPaid: boolean }) =>
      upsertRecurringBillInstance(billId, monthReference, undefined, isPaid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bill-instances'] });
    },
  });

  // Combinar contas com instâncias do mês (filtrar apenas contas ativas)
  const billsWithStatus = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);

    return bills
      .filter(bill => {
        // Contas recorrentes sempre aparecem
        if (!bill.is_installment) return true;

        // Contas parceladas: verificar se estão ativas neste mês
        if (!bill.start_month || !bill.total_installments) return false;

        const [startYear, startMonth] = bill.start_month.split('-').map(Number);
        const currentMonthIndex = (year - startYear) * 12 + (month - startMonth);

        // Mostrar se estamos dentro do range de parcelas
        return currentMonthIndex >= 0 && currentMonthIndex < bill.total_installments;
      })
      .map(bill => {
        const instance = instances.find(i => i.bill_id === bill.id);
        const isPaid = instance?.is_paid || false;
        const amount = instance?.adjusted_value ?? bill.value;

        // Calcular número da parcela atual
        let installmentNumber = 1;
        if (bill.is_installment && bill.start_month) {
          const [startYear, startMonth] = bill.start_month.split('-').map(Number);
          installmentNumber = (year - startYear) * 12 + (month - startMonth) + 1;
        }

        return { bill, isPaid, amount, instance, installmentNumber };
      });
  }, [bills, instances, selectedMonth]);

  // Totais
  const totals = useMemo(() => {
    const total = billsWithStatus.reduce((sum, item) => sum + item.amount, 0);
    const pago = billsWithStatus.filter(i => i.isPaid).reduce((sum, item) => sum + item.amount, 0);
    const pendente = total - pago;
    return { total, pago, pendente };
  }, [billsWithStatus]);

  // Handlers
  const handleOpenForm = (bill?: RecurringBill) => {
    if (bill) {
      setEditingBill(bill);
      setFormData({
        name: bill.name,
        value: String(bill.value),
        due_date: String(bill.due_date),
        category: bill.category || '',
        bank: bill.bank || '',
        is_installment: bill.is_installment || false,
        total_installments: bill.total_installments ? String(bill.total_installments) : '',
        start_month: bill.start_month || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
      });
    } else {
      setEditingBill(null);
      setFormData({
        name: '',
        value: '',
        due_date: '1',
        category: '',
        bank: '',
        is_installment: false,
        total_installments: '',
        start_month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingBill(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const value = parseFloat(formData.value);
    const dueDate = parseInt(formData.due_date);

    if (isNaN(value) || value <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }

    if (isNaN(dueDate) || dueDate < 1 || dueDate > 31) {
      toast({ title: 'Dia de vencimento inválido (1-31)', variant: 'destructive' });
      return;
    }

    // Validar parcelado
    if (formData.is_installment) {
      const totalInstallments = parseInt(formData.total_installments);
      if (isNaN(totalInstallments) || totalInstallments < 2) {
        toast({ title: 'Número de parcelas deve ser no mínimo 2', variant: 'destructive' });
        return;
      }
    }

    const data = {
      name: formData.name,
      value,
      due_date: dueDate,
      category: formData.category,
      bank: formData.bank,
      is_installment: formData.is_installment,
      total_installments: formData.is_installment ? parseInt(formData.total_installments) : undefined,
      current_installment: 1,
      start_month: formData.is_installment ? formData.start_month : undefined,
    };

    if (editingBill) {
      updateMutation.mutate({ id: editingBill.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Confirma a exclusão desta conta recorrente?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleTogglePaid = (billId: string, currentStatus: boolean) => {
    togglePaidMutation.mutate({ billId, isPaid: !currentStatus });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando contas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contas Recorrentes</h1>
          <p className="text-gray-600 mt-1">{bills.length} contas cadastradas</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      {/* Filtro de mês */}
      <div className="max-w-xs">
        <Label>Mês de Referência</Label>
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Totais */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-gray-50 border-gray-200">
          <div className="text-sm text-gray-700 font-medium">Total</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totals.total)}</div>
        </Card>
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="text-sm text-green-700 font-medium">Pago</div>
          <div className="text-2xl font-bold text-green-900 mt-1">{formatCurrency(totals.pago)}</div>
        </Card>
        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="text-sm text-orange-700 font-medium">Pendente</div>
          <div className="text-2xl font-bold text-orange-900 mt-1">{formatCurrency(totals.pendente)}</div>
        </Card>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {billsWithStatus.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            Nenhuma conta cadastrada
          </Card>
        ) : (
          billsWithStatus.map(({ bill, isPaid, amount, installmentNumber }) => (
            <Card key={bill.id} className={`p-4 transition-all ${isPaid ? 'bg-green-50/50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <Checkbox
                    checked={isPaid}
                    onCheckedChange={() => handleTogglePaid(bill.id, isPaid)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-gray-900 text-lg">{bill.name}</div>
                      <div className="text-sm text-gray-500">Vence dia {bill.due_date}</div>
                      {bill.is_installment && bill.total_installments && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Parcela {installmentNumber}/{bill.total_installments}
                        </span>
                      )}
                    </div>
                    {bill.category && (
                      <div className="text-sm text-gray-600 mt-1">{bill.category}</div>
                    )}
                    {bill.bank && (
                      <div className="text-sm text-gray-500 mt-1">{bill.bank}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`text-xl font-bold ${isPaid ? 'text-green-600' : 'text-gray-900'}`}>
                    {formatCurrency(amount)}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenForm(bill)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(bill.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingBill ? 'Editar Conta' : 'Nova Conta Recorrente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome da Conta *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Aluguel, Internet, Luz..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label>Dia de Vencimento *</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  placeholder="1-31"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Categoria</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Moradia, Serviços, Transporte..."
              />
            </div>

            <div>
              <Label>Banco/Conta</Label>
              <Input
                value={formData.bank}
                onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                placeholder="Ex: Nubank, C6, Bradesco..."
              />
            </div>

            <div className="border-t pt-4">
              <Label>Tipo de Conta</Label>
              <Select
                value={formData.is_installment ? 'installment' : 'recurring'}
                onValueChange={(value) => setFormData({ ...formData, is_installment: value === 'installment' })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring">Recorrente (todo mês)</SelectItem>
                  <SelectItem value="installment">Parcelado (número fixo de meses)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.is_installment && (
              <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
                <div>
                  <Label>Número de Parcelas *</Label>
                  <Input
                    type="number"
                    min="2"
                    value={formData.total_installments}
                    onChange={(e) => setFormData({ ...formData, total_installments: e.target.value })}
                    placeholder="Ex: 12"
                    required={formData.is_installment}
                  />
                </div>
                <div>
                  <Label>Mês de Início *</Label>
                  <Input
                    type="month"
                    value={formData.start_month}
                    onChange={(e) => setFormData({ ...formData, start_month: e.target.value })}
                    required={formData.is_installment}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingBill ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
