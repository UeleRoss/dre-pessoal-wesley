
import { useState } from "react";
import { Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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

interface BankManagerProps {
  userId: string;
}

const BankManager = ({ userId }: BankManagerProps) => {
  const [newBank, setNewBank] = useState("");
  const [editingBank, setEditingBank] = useState<{ old: string; new: string } | null>(null);
  const { toast } = useToast();

  const { data: banks = [], refetch } = useQuery({
    queryKey: ['banks', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_items')
        .select('bank')
        .eq('user_id', userId);
      
      if (error) throw error;
      return [...new Set(data.map(item => item.bank))];
    },
    enabled: !!userId
  });

  const handleAddBank = async () => {
    if (!newBank.trim()) return;
    
    if (banks.includes(newBank)) {
      toast({
        title: "Erro",
        description: "Este banco já existe",
        variant: "destructive",
      });
      return;
    }

    setNewBank("");
    toast({
      title: "Sucesso",
      description: "Banco adicionado! Você pode usá-lo em novos lançamentos",
    });
  };

  const handleEditBank = async () => {
    if (!editingBank || !editingBank.new.trim()) return;
    
    const { error } = await supabase
      .from('financial_items')
      .update({ bank: editingBank.new })
      .eq('user_id', userId)
      .eq('bank', editingBank.old);
    
    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao editar banco",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Banco editado com sucesso",
      });
      setEditingBank(null);
      refetch();
    }
  };

  const handleDeleteBank = async (bank: string) => {
    const { error } = await supabase
      .from('financial_items')
      .delete()
      .eq('user_id', userId)
      .eq('bank', bank);
    
    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir banco",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Banco e seus lançamentos excluídos com sucesso",
      });
      refetch();
    }
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
            onKeyPress={(e) => e.key === 'Enter' && handleAddBank()}
          />
          <Button onClick={handleAddBank}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
        
        <div className="space-y-2">
          {banks.map((bank) => (
            <div key={bank} className="flex items-center justify-between p-2 border rounded">
              {editingBank?.old === bank ? (
                <div className="flex gap-2 flex-1">
                  <Input
                    value={editingBank.new}
                    onChange={(e) => setEditingBank({ ...editingBank, new: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && handleEditBank()}
                  />
                  <Button size="sm" onClick={handleEditBank}>Salvar</Button>
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
                          <AlertDialogAction onClick={() => handleDeleteBank(bank)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BankManager;
