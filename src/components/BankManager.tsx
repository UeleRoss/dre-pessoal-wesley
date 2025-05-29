
import { useState } from "react";
import { Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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

const BankManager = () => {
  const [newBank, setNewBank] = useState("");
  const [editingBank, setEditingBank] = useState<{ old: string; new: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    }
  });

  const { data: banks = [], refetch } = useQuery({
    queryKey: ['banks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('Buscando bancos para o usuário:', user.id);
      
      const { data, error } = await supabase
        .from('financial_items')
        .select('bank')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Erro ao buscar bancos:', error);
        throw error;
      }
      
      const uniqueBanks = [...new Set(data.map(item => item.bank))];
      console.log('Bancos encontrados:', uniqueBanks);
      return uniqueBanks;
    },
    enabled: !!user?.id
  });

  const addBankMutation = useMutation({
    mutationFn: async (bankName: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      console.log('Adicionando banco:', bankName);
      
      // Criar um lançamento fictício apenas para adicionar o banco ao sistema
      const { data, error } = await supabase
        .from('financial_items')
        .insert([{
          description: `Configuração inicial - ${bankName}`,
          amount: 0,
          type: 'entrada',
          category: 'Configuração',
          bank: bankName,
          date: new Date().toISOString().split('T')[0],
          user_id: user.id,
          source: 'sistema'
        }])
        .select();
      
      if (error) {
        console.error('Erro ao adicionar banco:', error);
        throw error;
      }
      
      console.log('Banco adicionado com sucesso:', data);
      return bankName;
    },
    onSuccess: (bankName) => {
      console.log('Mutation onSuccess chamado para:', bankName);
      
      toast({
        title: "Sucesso",
        description: `Banco ${bankName} adicionado com sucesso!`,
      });
      
      setNewBank("");
      
      // Invalidar queries relacionadas para atualizar selects
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
      queryClient.invalidateQueries({ queryKey: ['available-banks'] });
      
      refetch();
    },
    onError: (error) => {
      console.error('Erro na mutation:', error);
      
      toast({
        title: "Erro",
        description: `Erro ao adicionar banco: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const editBankMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      console.log('Editando banco de', oldName, 'para', newName);
      
      const { error } = await supabase
        .from('financial_items')
        .update({ bank: newName })
        .eq('user_id', user.id)
        .eq('bank', oldName);
      
      if (error) {
        console.error('Erro ao editar banco:', error);
        throw error;
      }
      
      return { oldName, newName };
    },
    onSuccess: ({ oldName, newName }) => {
      toast({
        title: "Sucesso",
        description: `Banco ${oldName} renomeado para ${newName}`,
      });
      setEditingBank(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
      queryClient.invalidateQueries({ queryKey: ['available-banks'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao editar banco: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const deleteBankMutation = useMutation({
    mutationFn: async (bankName: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      console.log('Excluindo banco:', bankName);
      
      const { error } = await supabase
        .from('financial_items')
        .delete()
        .eq('user_id', user.id)
        .eq('bank', bankName);
      
      if (error) {
        console.error('Erro ao excluir banco:', error);
        throw error;
      }
      
      return bankName;
    },
    onSuccess: (bankName) => {
      toast({
        title: "Sucesso",
        description: `Banco ${bankName} e seus lançamentos excluídos`,
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
      queryClient.invalidateQueries({ queryKey: ['available-banks'] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao excluir banco: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleAddBank = async () => {
    if (!newBank.trim()) {
      toast({
        title: "Erro",
        description: "Nome do banco não pode estar vazio",
        variant: "destructive",
      });
      return;
    }
    
    if (banks.includes(newBank.trim())) {
      toast({
        title: "Erro",
        description: "Este banco já existe",
        variant: "destructive",
      });
      return;
    }

    console.log('Tentando adicionar banco:', newBank.trim());
    addBankMutation.mutate(newBank.trim());
  };

  const handleEditBank = async () => {
    if (!editingBank || !editingBank.new.trim()) return;
    
    if (banks.includes(editingBank.new.trim()) && editingBank.new.trim() !== editingBank.old) {
      toast({
        title: "Erro",
        description: "Este nome de banco já existe",
        variant: "destructive",
      });
      return;
    }
    
    editBankMutation.mutate({
      oldName: editingBank.old,
      newName: editingBank.new.trim()
    });
  };

  const handleDeleteBank = async (bank: string) => {
    deleteBankMutation.mutate(bank);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Bancos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nome do novo banco"
            value={newBank}
            onChange={(e) => setNewBank(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddBank();
              }
            }}
          />
          <Button 
            onClick={handleAddBank}
            disabled={addBankMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            {addBankMutation.isPending ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </div>
        
        <div className="space-y-2">
          {banks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum banco encontrado.</p>
              <p className="text-sm">Adicione um banco acima para começar.</p>
            </div>
          ) : (
            banks.map((bank) => (
              <div key={bank} className="flex items-center justify-between p-2 border rounded">
                {editingBank?.old === bank ? (
                  <div className="flex gap-2 flex-1">
                    <Input
                      value={editingBank.new}
                      onChange={(e) => setEditingBank({ ...editingBank, new: e.target.value })}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleEditBank();
                        }
                      }}
                    />
                    <Button 
                      size="sm" 
                      onClick={handleEditBank}
                      disabled={editBankMutation.isPending}
                    >
                      {editBankMutation.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingBank(null)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <>
                    <Badge variant="outline">{bank}</Badge>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingBank({ old: bank, new: bank })}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Banco</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso excluirá o banco "{bank}" e TODOS os lançamentos associados a ele. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteBank(bank)}
                              disabled={deleteBankMutation.isPending}
                            >
                              {deleteBankMutation.isPending ? 'Excluindo...' : 'Excluir'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BankManager;
