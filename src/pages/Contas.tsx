
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import Auth from "@/components/Auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const BANKS = ['CONTA SIMPLES', 'BRADESCO', 'C6 BANK', 'ASAAS', 'NOMAD'];
const CATEGORIES = [
  "Carro", "Comida", "Contas Mensais", "Entre bancos", "Escritório", 
  "Estudos", "Go On Outdoor", "Imposto", "Investimentos", "Lazer e ócio", 
  "Pro-Labore", "Vida esportiva", "Anúncios Online", "Itens Físicos"
];

interface RecurringBill {
  id: string;
  name: string;
  value: number;
  due_date: number;
  category: string;
  bank: string;
  recurring: boolean;
  paid_this_month: boolean;
}

const Contas = () => {
  const [user, setUser] = useState<any>(null);
  const [showNewBillModal, setShowNewBillModal] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    due_date: '',
    category: '',
    bank: '',
    recurring: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Buscar contas cadastradas
  const { data: bills = [] } = useQuery({
    queryKey: ['recurring-bills', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('recurring_bills')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Buscar saldos dos bancos
  const { data: bankBalances = [] } = useQuery({
    queryKey: ['bank-balances'],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('bank_balances')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Buscar lançamentos do mês atual para calcular saldo atualizado
  const { data: monthlyItems = [] } = useQuery({
    queryKey: ['monthly-items-contas', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const createBillMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('recurring_bills')
        .insert([{
          ...data,
          value: parseFloat(data.value),
          due_date: parseInt(data.due_date),
          user_id: user.id
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Conta cadastrada",
        description: "Conta adicionada com sucesso!",
      });
      setShowNewBillModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar conta.",
        variant: "destructive",
      });
    }
  });

  const updateBillMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RecurringBill> }) => {
      const { error } = await supabase
        .from('recurring_bills')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Conta atualizada",
        description: "Alterações salvas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar conta.",
        variant: "destructive",
      });
    }
  });

  const deleteBillMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_bills')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Conta excluída",
        description: "Conta removida com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir conta.",
        variant: "destructive",
      });
    }
  });

  const togglePaidMutation = useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error } = await supabase
        .from('recurring_bills')
        .update({ paid_this_month: paid })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-bills'] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      value: '',
      due_date: '',
      category: '',
      bank: '',
      recurring: true
    });
    setEditingBill(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.value || !formData.due_date || !formData.category || !formData.bank) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (editingBill) {
      updateBillMutation.mutate({
        id: editingBill.id,
        data: {
          ...formData,
          value: parseFloat(formData.value),
          due_date: parseInt(formData.due_date)
        }
      });
      setEditingBill(null);
      setShowNewBillModal(false);
      resetForm();
    } else {
      createBillMutation.mutate(formData);
    }
  };

  const handleEdit = (bill: RecurringBill) => {
    setEditingBill(bill);
    setFormData({
      name: bill.name,
      value: bill.value.toString(),
      due_date: bill.due_date.toString(),
      category: bill.category,
      bank: bill.bank,
      recurring: bill.recurring
    });
    setShowNewBillModal(true);
  };

  // Calcular saldos atuais dos bancos
  const calculateCurrentBalances = () => {
    const balances: Record<string, number> = {};
    
    BANKS.forEach(bank => {
      const bankConfig = bankBalances.find(b => b.bank_name === bank);
      const initialBalance = bankConfig?.initial_balance || 0;
      
      const bankMovements = monthlyItems
        .filter(item => item.bank === bank)
        .reduce((sum, item) => {
          return item.type === 'entrada' ? sum + Number(item.amount) : sum - Number(item.amount);
        }, 0);
      
      balances[bank] = initialBalance + bankMovements;
    });
    
    return balances;
  };

  // Calcular totais
  const calculateTotals = () => {
    const totalBills = bills.reduce((sum, bill) => sum + bill.value, 0);
    const paidBills = bills.filter(bill => bill.paid_this_month).reduce((sum, bill) => sum + bill.value, 0);
    const unpaidBills = totalBills - paidBills;
    
    const currentBalances = calculateCurrentBalances();
    const totalCash = Object.values(currentBalances).reduce((sum, balance) => sum + balance, 0);
    
    return {
      totalBills,
      paidBills,
      unpaidBills,
      totalCash,
      remainingCash: totalCash - unpaidBills
    };
  };

  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  const totals = calculateTotals();
  const currentBalances = calculateCurrentBalances();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-800">Contas Recorrentes</h1>
          <p className="text-navy-600 mt-1">Gerencie suas contas fixas e previsão de caixa</p>
        </div>
        
        <Dialog open={showNewBillModal} onOpenChange={setShowNewBillModal}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBill ? 'Editar Conta' : 'Nova Conta Recorrente'}</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Conta</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Energia Elétrica"
                  required
                />
              </div>

              <div>
                <Label htmlFor="value">Valor</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="due_date">Dia do Vencimento</Label>
                <Input
                  id="due_date"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  placeholder="Ex: 15"
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
                    {CATEGORIES.map((category) => (
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

              <div className="flex items-center space-x-2">
                <Switch
                  id="recurring"
                  checked={formData.recurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, recurring: checked })}
                />
                <Label htmlFor="recurring">Conta recorrente (todo mês)</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowNewBillModal(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingBill ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Contas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy-800">
              {totals.totalBills.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {bills.length} contas cadastradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contas Pagas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totals.paidBills.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {bills.filter(b => b.paid_this_month).length} de {bills.length} pagas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contas Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totals.unpaidBills.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {bills.filter(b => !b.paid_this_month).length} pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Saldo Restante
              {totals.remainingCash < 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.remainingCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totals.remainingCash.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.remainingCash < 0 ? 'Saldo insuficiente!' : 'Após pagar todas as contas'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Contas */}
      <Card>
        <CardHeader>
          <CardTitle>Contas do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {bills.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg font-medium">Nenhuma conta cadastrada</p>
              <p className="text-sm">Adicione suas contas recorrentes para gerenciar melhor suas finanças</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePaidMutation.mutate({ id: bill.id, paid: !bill.paid_this_month })}
                      className="p-1"
                    >
                      {bill.paid_this_month ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </Button>
                    
                    <div>
                      <h3 className={`font-medium ${bill.paid_this_month ? 'line-through text-gray-500' : ''}`}>
                        {bill.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Vencimento: dia {bill.due_date} • {bill.category} • {bill.bank}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-bold ${bill.paid_this_month ? 'text-gray-500' : 'text-red-600'}`}>
                        {bill.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {bill.recurring ? 'Recorrente' : 'Único'}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(bill)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Conta</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir a conta "{bill.name}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteBillMutation.mutate(bill.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saldos por Banco */}
      <Card>
        <CardHeader>
          <CardTitle>Saldos Atuais por Banco</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BANKS.map((bank) => (
              <div key={bank} className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-navy-800">{bank}</h4>
                <p className={`text-lg font-bold ${currentBalances[bank] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currentBalances[bank].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-xs text-gray-500">
                  Contas pendentes: {bills.filter(b => b.bank === bank && !b.paid_this_month).reduce((sum, b) => sum + b.value, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Contas;
