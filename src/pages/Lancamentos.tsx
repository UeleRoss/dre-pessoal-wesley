import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  fetchFinancialItems,
  createFinancialItem,
  updateFinancialItem,
  deleteFinancialItem,
  fetchBusinessUnits,
  fetchUnitCategories,
  type FinancialItem,
} from "@/services/api";
import { Trash2, Edit, Plus } from "lucide-react";

export default function Lancamentos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date();

  // Estado
  const [selectedMonth, setSelectedMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FinancialItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    date: today.toISOString().split('T')[0],
    type: 'saida' as 'entrada' | 'saida',
    description: '',
    amount: '',
    category: '',
    bank: '',
    business_unit_id: '',
  });

  // Calcular range de datas do mês selecionado
  const dateRange = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    return { startDate, endDate };
  }, [selectedMonth]);

  // Queries
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['financial-items', dateRange.startDate, dateRange.endDate],
    queryFn: () => fetchFinancialItems(dateRange.startDate, dateRange.endDate),
  });

  const { data: businessUnits = [] } = useQuery({
    queryKey: ['business-units'],
    queryFn: fetchBusinessUnits,
  });

  const { data: unitCategories = [] } = useQuery({
    queryKey: ['unit-categories', formData.business_unit_id],
    queryFn: () => fetchUnitCategories(formData.business_unit_id),
    enabled: !!formData.business_unit_id,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createFinancialItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
      toast({ title: 'Lançamento criado com sucesso!' });
      handleCloseForm();
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar lançamento', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FinancialItem> }) => updateFinancialItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
      toast({ title: 'Lançamento atualizado!' });
      handleCloseForm();
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFinancialItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
      toast({ title: 'Lançamento deletado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao deletar', description: error.message, variant: 'destructive' });
    },
  });

  // Filtrar items
  const filteredItems = useMemo(() => {
    if (selectedUnitId === 'all') return items;
    return items.filter(item => item.business_unit_id === selectedUnitId);
  }, [items, selectedUnitId]);

  // Calcular totais
  const totals = useMemo(() => {
    const entradas = filteredItems.filter(i => i.type === 'entrada').reduce((sum, i) => sum + i.amount, 0);
    const saidas = filteredItems.filter(i => i.type === 'saida').reduce((sum, i) => sum + i.amount, 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [filteredItems]);

  // Handlers
  const handleOpenForm = (item?: FinancialItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        date: item.date,
        type: item.type,
        description: item.description,
        amount: String(item.amount),
        category: item.category || '',
        bank: item.bank || '',
        business_unit_id: item.business_unit_id || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        date: today.toISOString().split('T')[0],
        type: 'saida',
        description: '',
        amount: '',
        category: '',
        bank: '',
        business_unit_id: '',
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' });
      return;
    }

    const data = {
      ...formData,
      amount,
      is_installment: false,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Confirma a exclusão deste lançamento?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando lançamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lançamentos</h1>
          <p className="text-gray-600 mt-1">{filteredItems.length} lançamentos encontrados</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Lançamento
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Label>Mês</Label>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="flex-1">
          <Label>Unidade</Label>
          <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as unidades</SelectItem>
              {businessUnits.map(unit => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="text-sm text-green-700 font-medium">Entradas</div>
          <div className="text-2xl font-bold text-green-900 mt-1">{formatCurrency(totals.entradas)}</div>
        </Card>
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="text-sm text-red-700 font-medium">Saídas</div>
          <div className="text-2xl font-bold text-red-900 mt-1">{formatCurrency(totals.saidas)}</div>
        </Card>
        <Card className={`p-4 ${totals.saldo >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className={`text-sm font-medium ${totals.saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Saldo</div>
          <div className={`text-2xl font-bold mt-1 ${totals.saldo >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
            {formatCurrency(totals.saldo)}
          </div>
        </Card>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            Nenhum lançamento encontrado neste período
          </Card>
        ) : (
          filteredItems.map(item => {
            const unit = businessUnits.find(u => u.id === item.business_unit_id);
            return (
              <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-gray-500">{formatDate(item.date)}</div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        item.type === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.type === 'entrada' ? 'Entrada' : 'Saída'}
                      </div>
                      {unit && (
                        <div className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {unit.name}
                        </div>
                      )}
                    </div>
                    <div className="font-medium text-gray-900 mt-1">{item.description}</div>
                    {item.category && (
                      <div className="text-sm text-gray-500 mt-1">{item.category}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`text-xl font-bold ${
                      item.type === 'entrada' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(item.amount)}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenForm(item)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Tipo *</Label>
                <Select value={formData.type} onValueChange={(v: 'entrada' | 'saida') => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Aluguel, Salário, Compras..."
                required
              />
            </div>

            <div>
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label>Unidade de Negócio</Label>
              <Select
                value={formData.business_unit_id}
                onValueChange={(v) => setFormData({ ...formData, business_unit_id: v, category: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {businessUnits.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {unitCategories.length > 0 && (
              <div>
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unitCategories
                      .filter(c => c.type === formData.type)
                      .map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Banco/Conta</Label>
              <Input
                value={formData.bank}
                onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                placeholder="Ex: Nubank, C6, Bradesco..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingItem ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
