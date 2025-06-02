
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, RefreshCw, Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const BankBalanceManager = () => {
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [editingBank, setEditingBank] = useState<{name: string, newName: string} | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar saldos iniciais configurados
  const { data: bankBalances = [] } = useQuery({
    queryKey: ['bank-balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_balances')
        .select('*');
      
      if (error) throw error;
      return data;
    }
  });

  // Buscar bancos únicos dos lançamentos do usuário
  const { data: userBanks = [] } = useQuery({
    queryKey: ['user-banks'],
    queryFn: async () => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return [];

      const { data, error } = await supabase
        .from('financial_items')
        .select('bank')
        .eq('user_id', user.data.user.id);
      
      if (error) throw error;
      
      const uniqueBanks = [...new Set(data.map(item => item.bank))].filter(Boolean);
      return uniqueBanks;
    }
  });

  // Combinar bancos configurados com bancos dos lançamentos
  const allUserBanks = React.useMemo(() => {
    const configuredBanks = bankBalances.map(b => b.bank_name);
    const allBanks = [...new Set([...configuredBanks, ...userBanks])];
    return allBanks.sort();
  }, [bankBalances, userBanks]);

  // Mutation para salvar/atualizar saldos
  const saveBankBalancesMutation = useMutation({
    mutationFn: async (bankBalances: Record<string, number>) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      const configDate = new Date().toISOString();

      const updates = Object.entries(bankBalances).map(([bank, balance]) => ({
        user_id: user.data.user.id,
        bank_name: bank,
        initial_balance: balance,
        updated_at: configDate
      }));

      const { error } = await supabase
        .from('bank_balances')
        .upsert(updates, { 
          onConflict: 'user_id,bank_name',
          ignoreDuplicates: false 
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-balances'] });
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
      toast({
        title: "Saldos configurados",
        description: "Saldos iniciais atualizados!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar saldos iniciais.",
        variant: "destructive",
      });
    }
  });

  // Mutation para adicionar novo banco
  const addBankMutation = useMutation({
    mutationFn: async (bankName: string) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('bank_balances')
        .insert({
          user_id: user.data.user.id,
          bank_name: bankName,
          initial_balance: 0,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-balances'] });
      setShowAddBank(false);
      setNewBankName("");
      toast({
        title: "Banco adicionado",
        description: "Novo banco adicionado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar banco.",
        variant: "destructive",
      });
    }
  });

  // Mutation para editar nome do banco
  const editBankMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string, newName: string }) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('bank_balances')
        .update({ bank_name: newName })
        .eq('user_id', user.data.user.id)
        .eq('bank_name', oldName);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-balances'] });
      setEditingBank(null);
      toast({
        title: "Banco renomeado",
        description: "Nome do banco atualizado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao renomear banco.",
        variant: "destructive",
      });
    }
  });

  // Mutation para deletar banco
  const deleteBankMutation = useMutation({
    mutationFn: async (bankName: string) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('bank_balances')
        .delete()
        .eq('user_id', user.data.user.id)
        .eq('bank_name', bankName);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-balances'] });
      toast({
        title: "Banco removido",
        description: "Banco removido com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover banco.",
        variant: "destructive",
      });
    }
  });

  // Inicializar balances com valores salvos
  React.useEffect(() => {
    const initialBalances: Record<string, number> = {};
    allUserBanks.forEach(bank => {
      const existingBalance = bankBalances.find(b => b.bank_name === bank);
      initialBalances[bank] = existingBalance?.initial_balance || 0;
    });
    setBalances(initialBalances);
  }, [bankBalances, allUserBanks]);

  const handleBalanceChange = (bank: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setBalances(prev => ({ ...prev, [bank]: numValue }));
  };

  const handleSave = () => {
    saveBankBalancesMutation.mutate(balances);
  };

  const handleAddBank = () => {
    if (newBankName.trim()) {
      addBankMutation.mutate(newBankName.trim());
    }
  };

  const handleEditBank = () => {
    if (editingBank && editingBank.newName.trim()) {
      editBankMutation.mutate({
        oldName: editingBank.name,
        newName: editingBank.newName.trim()
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Configurar Saldos Iniciais dos Bancos
          <Badge variant="outline">Setup Personalizado</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>Importante:</strong> Configure os saldos iniciais dos seus bancos. 
            Você pode adicionar novos bancos, editar nomes ou remover bancos que não usa mais.
          </p>
        </div>

        {/* Botão para adicionar novo banco */}
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Seus Bancos</h3>
          <Dialog open={showAddBank} onOpenChange={setShowAddBank}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Banco
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Banco</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Nome do banco"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddBank(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddBank} disabled={!newBankName.trim()}>
                    Adicionar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allUserBanks.map((bank) => (
            <div key={bank} className="space-y-2 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{bank}</label>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingBank({ name: bank, newName: bank })}
                    className="h-6 w-6 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteBankMutation.mutate(bank)}
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={balances[bank] || ''}
                  onChange={(e) => handleBalanceChange(bank, e.target.value)}
                />
                <div className="text-xs text-gray-500 self-center min-w-20">
                  {formatCurrency(balances[bank] || 0)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {allUserBanks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Você ainda não tem bancos configurados.</p>
            <p className="text-sm">Adicione um banco para começar.</p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleSave}
            disabled={saveBankBalancesMutation.isPending || allUserBanks.length === 0}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            Configurar Saldos
          </Button>
        </div>

        {/* Modal para editar nome do banco */}
        <Dialog open={!!editingBank} onOpenChange={() => setEditingBank(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Nome do Banco</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Novo nome do banco"
                value={editingBank?.newName || ''}
                onChange={(e) => setEditingBank(prev => prev ? { ...prev, newName: e.target.value } : null)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingBank(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleEditBank} disabled={!editingBank?.newName.trim()}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default BankBalanceManager;
