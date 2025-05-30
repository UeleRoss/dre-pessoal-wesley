
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, PiggyBank, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import Auth from "@/components/Auth";
import InvestmentCategoryManager from "@/components/InvestmentCategoryManager";
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

const DEFAULT_INVESTMENT_CATEGORIES = [
  'Renda Fixa c6 bank',
  'Fundos imobiliários',
  'Fundo Go On Outdoor',
  'Reserva Carro',
  'Reserva Casa Nova',
  'Reserva de Emergência'
];

interface Investment {
  id: string;
  name: string;
  category: string;
  initial_amount: number;
  current_balance: number;
  created_at: string;
}

interface InvestmentTransaction {
  id: string;
  investment_id: string;
  type: 'aporte' | 'retirada';
  amount: number;
  bank?: string;
  description?: string;
  date: string;
  created_at: string;
}

const Investimentos = () => {
  const [user, setUser] = useState<any>(null);
  const [showNewInvestmentModal, setShowNewInvestmentModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [investmentForm, setInvestmentForm] = useState({
    name: '',
    category: '',
    initial_amount: '',
    is_setup: false,
    source_bank: ''
  });
  const [transactionForm, setTransactionForm] = useState({
    type: 'aporte' as 'aporte' | 'retirada',
    amount: '',
    bank: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
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

  // Buscar categorias de investimento (padrão + personalizadas)
  const { data: investmentCategories = [] } = useQuery({
    queryKey: ['investment-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_categories')
        .select('*')
        .order('name');
      
      if (error) {
        // Se a tabela não existir ainda, usar apenas as categorias padrão
        return DEFAULT_INVESTMENT_CATEGORIES.sort();
      }
      
      // Combinar categorias padrão com personalizadas
      const customCategories = data.map(cat => cat.name);
      const allCategories = [...DEFAULT_INVESTMENT_CATEGORIES];
      
      // Adicionar categorias personalizadas que não estão nas padrão
      customCategories.forEach(cat => {
        if (!allCategories.includes(cat)) {
          allCategories.push(cat);
        }
      });
      
      return allCategories.sort();
    }
  });

  // Buscar investimentos
  const { data: investments = [] } = useQuery({
    queryKey: ['investments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Buscar transações de investimentos
  const { data: transactions = [] } = useQuery({
    queryKey: ['investment-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('investment_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const createInvestmentMutation = useMutation({
    mutationFn: async (data: typeof investmentForm) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Criar investimento
      const { error: investmentError } = await supabase
        .from('investments')
        .insert([{
          name: data.name,
          category: data.category,
          initial_amount: parseFloat(data.initial_amount),
          current_balance: parseFloat(data.initial_amount),
          user_id: user.id
        }]);
      
      if (investmentError) throw investmentError;

      // Se não for setup inicial e tiver banco de origem, criar lançamento de saída
      if (!data.is_setup && data.source_bank) {
        const { error: entryError } = await supabase
          .from('financial_items')
          .insert([{
            description: `Investimento: ${data.name}`,
            amount: parseFloat(data.initial_amount),
            type: 'saida',
            category: 'Investimentos',
            bank: data.source_bank,
            date: new Date().toISOString().split('T')[0],
            user_id: user.id,
            source: 'investimento'
          }]);

        if (entryError) throw entryError;
      }
    },
    onSuccess: () => {
      toast({
        title: "Investimento criado",
        description: investmentForm.is_setup 
          ? "Investimento de setup criado com sucesso!" 
          : "Novo investimento adicionado e valor debitado!",
      });
      setShowNewInvestmentModal(false);
      resetInvestmentForm();
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar investimento.",
        variant: "destructive",
      });
    }
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: typeof transactionForm & { investment_id: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Criar transação
      const { error: transactionError } = await supabase
        .from('investment_transactions')
        .insert([{
          ...data,
          amount: parseFloat(data.amount),
          user_id: user.id
        }]);
      
      if (transactionError) throw transactionError;

      // Atualizar saldo do investimento
      const investment = investments.find(inv => inv.id === data.investment_id);
      if (!investment) throw new Error('Investimento não encontrado');

      const newBalance = data.type === 'aporte' 
        ? investment.current_balance + parseFloat(data.amount)
        : investment.current_balance - parseFloat(data.amount);

      const { error: updateError } = await supabase
        .from('investments')
        .update({ current_balance: newBalance })
        .eq('id', data.investment_id);

      if (updateError) throw updateError;

      // Se for retirada, criar lançamento de entrada no banco selecionado
      if (data.type === 'retirada' && data.bank) {
        const { error: entryError } = await supabase
          .from('financial_items')
          .insert([{
            description: `Retirada de investimento: ${investment.name}`,
            amount: parseFloat(data.amount),
            type: 'entrada',
            category: 'Investimentos',
            bank: data.bank,
            date: data.date,
            user_id: user.id,
            source: 'investimento'
          }]);

        if (entryError) throw entryError;
      }

      // Se for aporte, criar lançamento de saída no banco selecionado
      if (data.type === 'aporte' && data.bank) {
        const { error: entryError } = await supabase
          .from('financial_items')
          .insert([{
            description: `Aporte em investimento: ${investment.name}`,
            amount: parseFloat(data.amount),
            type: 'saida',
            category: 'Investimentos',
            bank: data.bank,
            date: data.date,
            user_id: user.id,
            source: 'investimento'
          }]);

        if (entryError) throw entryError;
      }
    },
    onSuccess: () => {
      toast({
        title: "Transação registrada",
        description: transactionForm.type === 'aporte' ? "Aporte realizado com sucesso!" : "Retirada realizada com sucesso!",
      });
      setShowTransactionModal(false);
      resetTransactionForm();
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investment-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao registrar transação.",
        variant: "destructive",
      });
    }
  });

  const deleteInvestmentMutation = useMutation({
    mutationFn: async (id: string) => {
      // Excluir transações primeiro (devido à constraint de FK)
      const { error: transactionError } = await supabase
        .from('investment_transactions')
        .delete()
        .eq('investment_id', id);

      if (transactionError) throw transactionError;

      // Excluir investimento
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Investimento excluído",
        description: "Investimento e histórico removidos com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investment-transactions'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao excluir investimento.",
        variant: "destructive",
      });
    }
  });

  const resetInvestmentForm = () => {
    setInvestmentForm({
      name: '',
      category: '',
      initial_amount: '',
      is_setup: false,
      source_bank: ''
    });
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      type: 'aporte',
      amount: '',
      bank: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setSelectedInvestment(null);
  };

  const handleInvestmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!investmentForm.name || !investmentForm.category || !investmentForm.initial_amount) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (!investmentForm.is_setup && !investmentForm.source_bank) {
      toast({
        title: "Banco obrigatório",
        description: "Selecione o banco de origem para investimentos que não são de setup.",
        variant: "destructive",
      });
      return;
    }

    createInvestmentMutation.mutate(investmentForm);
  };

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedInvestment || !transactionForm.amount || !transactionForm.bank) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    createTransactionMutation.mutate({
      ...transactionForm,
      investment_id: selectedInvestment.id
    });
  };

  const openTransactionModal = (investment: Investment, type: 'aporte' | 'retirada') => {
    setSelectedInvestment(investment);
    setTransactionForm({
      ...transactionForm,
      type
    });
    setShowTransactionModal(true);
  };

  // Calcular totais
  const totalInvested = investments.reduce((sum, inv) => sum + inv.current_balance, 0);
  const totalInitial = investments.reduce((sum, inv) => sum + inv.initial_amount, 0);
  const totalReturn = totalInvested - totalInitial;

  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-800">Investimentos</h1>
          <p className="text-navy-600 mt-1">Gerencie seus investimentos e aportes</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Categorias
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Gerenciar Categorias de Investimento</DialogTitle>
              </DialogHeader>
              <InvestmentCategoryManager />
            </DialogContent>
          </Dialog>

          <Dialog open={showNewInvestmentModal} onOpenChange={setShowNewInvestmentModal}>
            <DialogTrigger asChild>
              <Button onClick={resetInvestmentForm}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Investimento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Investimento</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleInvestmentSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Investimento</Label>
                  <Input
                    id="name"
                    value={investmentForm.name}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, name: e.target.value })}
                    placeholder="Ex: Nubank Reserva de Emergência"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={investmentForm.category}
                    onValueChange={(value) => setInvestmentForm({ ...investmentForm, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {investmentCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="initial_amount">Valor Inicial</Label>
                  <Input
                    id="initial_amount"
                    type="number"
                    step="0.01"
                    value={investmentForm.initial_amount}
                    onChange={(e) => setInvestmentForm({ ...investmentForm, initial_amount: e.target.value })}
                    placeholder="15000.00"
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_setup"
                    checked={investmentForm.is_setup}
                    onCheckedChange={(checked) => setInvestmentForm({ ...investmentForm, is_setup: checked as boolean })}
                  />
                  <Label htmlFor="is_setup" className="text-sm">
                    Setup inicial (não descontar do caixa)
                  </Label>
                </div>

                {!investmentForm.is_setup && (
                  <div>
                    <Label htmlFor="source_bank">Banco de Origem</Label>
                    <Select
                      value={investmentForm.source_bank}
                      onValueChange={(value) => setInvestmentForm({ ...investmentForm, source_bank: value })}
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
                )}

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowNewInvestmentModal(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    Criar Investimento
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy-800">
              {totalInvested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {investments.length} investimentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor Inicial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {totalInitial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Valores iniciais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rendimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalReturn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalInitial > 0 ? ((totalReturn / totalInitial) * 100).toFixed(2) : 0}% de retorno
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Investimentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {investments.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            <PiggyBank className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">Nenhum investimento cadastrado</p>
            <p className="text-sm">Comece adicionando seus primeiros investimentos</p>
          </div>
        ) : (
          investments.map((investment) => {
            const investmentTransactions = transactions.filter(t => t.investment_id === investment.id);
            const returns = investment.current_balance - investment.initial_amount;
            const returnPercent = investment.initial_amount > 0 ? ((returns / investment.initial_amount) * 100) : 0;
            
            return (
              <Card key={investment.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{investment.name}</CardTitle>
                      <p className="text-sm text-gray-600">{investment.category}</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Investimento</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir "{investment.name}"? Isso também excluirá todo o histórico de transações. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteInvestmentMutation.mutate(investment.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-2xl font-bold text-navy-800">
                        {investment.current_balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      <p className="text-sm text-gray-600">
                        Inicial: {investment.initial_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    
                    <div className={`flex items-center gap-1 text-sm ${returns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {returns >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      <span>
                        {returns.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({returnPercent.toFixed(2)}%)
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => openTransactionModal(investment, 'aporte')}
                      >
                        Aporte
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => openTransactionModal(investment, 'retirada')}
                      >
                        Retirada
                      </Button>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {investmentTransactions.length} transações
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal de Transação */}
      <Dialog open={showTransactionModal} onOpenChange={setShowTransactionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transactionForm.type === 'aporte' ? 'Novo Aporte' : 'Nova Retirada'} - {selectedInvestment?.name}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleTransactionSubmit} className="space-y-4">
            <div>
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={transactionForm.amount}
                onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                placeholder="1000.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={transactionForm.date}
                onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="bank">
                {transactionForm.type === 'aporte' ? 'Banco (origem do aporte)' : 'Banco (destino da retirada)'}
              </Label>
              <Select
                value={transactionForm.bank}
                onValueChange={(value) => setTransactionForm({ ...transactionForm, bank: value })}
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

            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input
                id="description"
                value={transactionForm.description}
                onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                placeholder="Observações sobre a transação"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowTransactionModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {transactionForm.type === 'aporte' ? 'Registrar Aporte' : 'Registrar Retirada'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Investimentos;
