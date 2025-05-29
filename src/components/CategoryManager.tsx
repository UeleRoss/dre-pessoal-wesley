
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus } from "lucide-react";

interface CategoryManagerProps {
  userId: string;
}

const CategoryManager = ({ userId }: CategoryManagerProps) => {
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Categorias fixas definidas pelo usuário
  const fixedCategories = [
    'Carro',
    'Comida',
    'Contas Mensais',
    'Entre bancos',
    'Escritório',
    'Estudos',
    'Go On Outdoor',
    'Imposto',
    'Investimentos',
    'Lazer e ócio',
    'Pro-Labore',
    'Vida esportiva',
    'Anúncios Online',
    'Itens Físicos'
  ];

  // Busca apenas categorias personalizadas do usuário (que não estão nas fixas)
  const { data: customCategories = [] } = useQuery({
    queryKey: ['custom-categories', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_items')
        .select('category')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Extrai categorias únicas e filtra apenas as que não estão nas fixas
      const dbCategories = [...new Set(data.map(item => item.category))];
      return dbCategories.filter(cat => !fixedCategories.includes(cat));
    }
  });

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    
    // Verifica se já existe nas categorias fixas
    if (fixedCategories.includes(newCategory.trim())) {
      toast({
        title: "Categoria já existe",
        description: "Esta categoria já está disponível nas categorias padrão.",
        variant: "destructive",
      });
      return;
    }

    // Verifica se já existe nas categorias personalizadas
    if (customCategories.includes(newCategory.trim())) {
      toast({
        title: "Categoria já existe",
        description: "Esta categoria personalizada já foi criada.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Cria um lançamento temporário apenas para registrar a categoria
      const { error } = await supabase
        .from('financial_items')
        .insert({
          user_id: userId,
          date: new Date().toISOString().split('T')[0],
          type: 'entrada',
          description: 'Categoria criada - remover após uso',
          amount: 0.01,
          category: newCategory.trim(),
          bank: 'CONTA SIMPLES',
          source: 'Category Creation'
        });

      if (error) throw error;

      toast({
        title: "Categoria criada!",
        description: "A nova categoria foi adicionada com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ['custom-categories'] });
      setNewCategory("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (category: string) => {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${category}"?`)) return;
    
    setLoading(true);
    try {
      // Remove todos os lançamentos com essa categoria personalizada
      const { error } = await supabase
        .from('financial_items')
        .delete()
        .eq('user_id', userId)
        .eq('category', category);

      if (error) throw error;

      toast({
        title: "Categoria excluída!",
        description: "A categoria e todos os lançamentos relacionados foram removidos.",
      });

      queryClient.invalidateQueries({ queryKey: ['custom-categories'] });
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Categorias</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Categorias Fixas */}
        <div>
          <h4 className="font-medium mb-2">Categorias Padrão</h4>
          <div className="flex flex-wrap gap-2">
            {fixedCategories.map(category => (
              <Badge key={category} variant="secondary">
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* Categorias Personalizadas */}
        {customCategories.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Categorias Personalizadas</h4>
            <div className="flex flex-wrap gap-2">
              {customCategories.map(category => (
                <Badge key={category} variant="outline" className="flex items-center gap-1">
                  {category}
                  <button
                    onClick={() => handleDeleteCategory(category)}
                    className="ml-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Adicionar Nova Categoria */}
        <div className="flex gap-2">
          <Input
            placeholder="Nome da nova categoria"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
          />
          <Button onClick={handleAddCategory} disabled={loading || !newCategory.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryManager;
