
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Category {
  id: string;
  name: string;
  user_id: string;
  is_default?: boolean;
}

const CategoryManager = () => {
  const [newCategory, setNewCategory] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar apenas categorias personalizadas do usuário logado
  const { data: userCategories = [] } = useQuery({
    queryKey: ['user-categories'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      return data as Category[];
    }
  });

  // Mutation para adicionar categoria
  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('categories')
        .insert([{ name, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-categories'] });
      setNewCategory("");
      toast({
        title: "Categoria adicionada",
        description: "Nova categoria criada com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao adicionar categoria.",
        variant: "destructive",
      });
    }
  });

  // Mutation para remover categoria
  const deleteCategoryMutation = useMutation({
    mutationFn: async (category: Category) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-categories'] });
      toast({
        title: "Categoria removida",
        description: "Categoria removida com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover categoria.",
        variant: "destructive",
      });
    }
  });

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    
    // Verificar se não é duplicata
    if (userCategories.some(cat => cat.name === newCategory.trim())) {
      toast({
        title: "Categoria já existe",
        description: "Esta categoria já está disponível.",
        variant: "destructive",
      });
      return;
    }
    
    addCategoryMutation.mutate(newCategory.trim());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Minhas Categorias Personalizadas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nome da nova categoria"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
          />
          <Button 
            onClick={handleAddCategory}
            disabled={addCategoryMutation.isPending}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {userCategories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {userCategories.map((category) => (
              <div key={category.id} className="flex items-center gap-2 p-2 border rounded">
                <Badge variant="outline" className="flex-1 text-center">
                  {category.name}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteCategoryMutation.mutate(category)}
                  disabled={deleteCategoryMutation.isPending}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nenhuma categoria personalizada criada ainda.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryManager;
