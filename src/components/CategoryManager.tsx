
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Categorias fixas que sempre estarão disponíveis
const FIXED_CATEGORIES = [
  "Carro",
  "Comida", 
  "Contas Mensais",
  "Entre bancos",
  "Escritório",
  "Estudos",
  "Go On Outdoor",
  "Imposto",
  "Investimentos",
  "Lazer e ócio",
  "Pro-Labore",
  "Vida esportiva",
  "Anúncios Online",
  "Itens Físicos"
];

interface CustomCategory {
  id: string;
  name: string;
  user_id: string;
}

const CategoryManager = () => {
  const [newCategory, setNewCategory] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar categorias personalizadas do usuário
  const { data: customCategories = [] } = useQuery({
    queryKey: ['custom-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as CustomCategory[];
    }
  });

  // Mutation para adicionar categoria personalizada
  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('categories')
        .insert([{ name, user_id: user.data.user.id }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] });
      setNewCategory("");
      toast({
        title: "Categoria adicionada",
        description: "Nova categoria personalizada criada com sucesso!",
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

  // Mutation para remover categoria personalizada
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] });
      toast({
        title: "Categoria removida",
        description: "Categoria personalizada removida com sucesso!",
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
    
    // Verificar se não é duplicata das fixas ou personalizadas
    if (FIXED_CATEGORIES.includes(newCategory.trim()) || 
        customCategories.some(cat => cat.name === newCategory.trim())) {
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Categorias Padrão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {FIXED_CATEGORIES.map((category) => (
              <Badge key={category} variant="secondary" className="p-2 text-center">
                {category}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorias Personalizadas</CardTitle>
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

          {customCategories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {customCategories.map((category) => (
                <div key={category.id} className="flex items-center gap-2 p-2 border rounded">
                  <span className="flex-1 text-sm">{category.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteCategoryMutation.mutate(category.id)}
                    disabled={deleteCategoryMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhuma categoria personalizada criada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryManager;
