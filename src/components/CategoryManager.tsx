
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

interface CategoryManagerProps {
  userId: string;
}

const CategoryManager = ({ userId }: CategoryManagerProps) => {
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<{ old: string; new: string } | null>(null);
  const { toast } = useToast();

  const { data: categories = [], refetch } = useQuery({
    queryKey: ['categories', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_items')
        .select('category')
        .eq('user_id', userId);
      
      if (error) throw error;
      return [...new Set(data.map(item => item.category))];
    },
    enabled: !!userId
  });

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    
    if (categories.includes(newCategory)) {
      toast({
        title: "Erro",
        description: "Esta categoria já existe",
        variant: "destructive",
      });
      return;
    }

    setNewCategory("");
    toast({
      title: "Sucesso",
      description: "Categoria adicionada! Você pode usá-la em novos lançamentos",
    });
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !editingCategory.new.trim()) return;
    
    const { error } = await supabase
      .from('financial_items')
      .update({ category: editingCategory.new })
      .eq('user_id', userId)
      .eq('category', editingCategory.old);
    
    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao editar categoria",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Categoria editada com sucesso",
      });
      setEditingCategory(null);
      refetch();
    }
  };

  const handleDeleteCategory = async (category: string) => {
    const { error } = await supabase
      .from('financial_items')
      .delete()
      .eq('user_id', userId)
      .eq('category', category);
    
    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir categoria",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Categoria e seus lançamentos excluídos com sucesso",
      });
      refetch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Categorias</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nome da nova categoria"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
          />
          <Button onClick={handleAddCategory}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
        
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category} className="flex items-center justify-between p-2 border rounded">
              {editingCategory?.old === category ? (
                <div className="flex gap-2 flex-1">
                  <Input
                    value={editingCategory.new}
                    onChange={(e) => setEditingCategory({ ...editingCategory, new: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && handleEditCategory()}
                  />
                  <Button size="sm" onClick={handleEditCategory}>Salvar</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <>
                  <Badge variant="outline">{category}</Badge>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingCategory({ old: category, new: category })}
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
                          <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso excluirá a categoria "{category}" e TODOS os lançamentos associados a ela. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteCategory(category)}>
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

export default CategoryManager;
