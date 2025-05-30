import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit, Trash2, Plus, Search, Filter, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Auth from "@/components/Auth";
import NewEntryModal from "@/components/NewEntryModal";
import EditEntryModal from "@/components/EditEntryModal";
import MonthSelector from "@/components/MonthSelector";
import { formatBrazilDate, formatBrazilDateTime } from "@/utils/dateUtils";
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

interface FinancialItem {
  id: string;
  created_at: string;
  date: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  bank: string;
  source: string | null;
  user_id: string;
}

const BANKS = ['CONTA SIMPLES', 'BRADESCO', 'C6 BANK', 'ASAAS', 'NOMAD'];
const CATEGORIES = [
  "Carro", "Comida", "Contas Mensais", "Entre bancos", "Escritório", 
  "Estudos", "Go On Outdoor", "Imposto", "Investimentos", "Lazer e ócio", 
  "Pro-Labore", "Vida esportiva", "Anúncios Online", "Itens Físicos"
];

const Lancamentos = () => {
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<FinancialItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterBank, setFilterBank] = useState("");
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FinancialItem | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

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

  // Buscar lançamentos financeiros
  const { data: financialItems = [], refetch } = useQuery({
    queryKey: ['financial-items', selectedMonth.getMonth(), selectedMonth.getFullYear()],
    queryFn: async () => {
      if (!user) return [];
      
      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) throw error;
      setItems(data || []);
      return data;
    },
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: async (newItem: Omit<FinancialItem, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('financial_items')
        .insert([newItem]);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updatedItem: FinancialItem) => {
      const { data, error } = await supabase
        .from('financial_items')
        .update(updatedItem)
        .eq('id', updatedItem.id);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('financial_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
    }
  });

  const handleEdit = (item: FinancialItem) => {
    setEditingItem(item);
  };

  const handleCloseEditModal = () => {
    setEditingItem(null);
  };

  const filteredItems = financialItems.filter(item => {
    const searchTermLower = searchTerm.toLowerCase();
    const descriptionMatches = item.description.toLowerCase().includes(searchTermLower);
    const categoryMatches = filterCategory ? item.category === filterCategory : true;
    const typeMatches = filterType ? item.type === filterType : true;
    const bankMatches = filterBank ? item.bank === filterBank : true;

    return descriptionMatches && categoryMatches && typeMatches && bankMatches;
  });

  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800">Lançamentos Financeiros</h1>
          <p className="text-navy-600 mt-1">
            Gerencie suas receitas e despesas de forma eficiente
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <Button onClick={() => setShowNewEntryModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Lançamento
          </Button>
          
          <MonthSelector 
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Input
            type="text"
            placeholder="Buscar por descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <Select onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os tipos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
            </SelectContent>
          </Select>
          
          <Select onValueChange={setFilterCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as categorias</SelectItem>
              {CATEGORIES.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={setFilterBank}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por banco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os bancos</SelectItem>
              {BANKS.map(bank => (
                <SelectItem key={bank} value={bank}>{bank}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => {
            setSearchTerm("");
            setFilterType("");
            setFilterCategory("");
            setFilterBank("");
          }}>
            <Filter className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>
      </div>

      {/* Lista de Lançamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Lançamentos Financeiros</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg font-medium">Nenhum lançamento encontrado</p>
              <p className="text-sm">
                {searchTerm || filterType || filterCategory || filterBank 
                  ? "Tente ajustar os filtros para ver mais resultados"
                  : "Adicione seu primeiro lançamento financeiro"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <Badge variant={item.type === 'entrada' ? 'default' : 'destructive'}>
                        {item.type === 'entrada' ? 'Entrada' : 'Saída'}
                      </Badge>
                      <span className="font-medium">{item.description}</span>
                    </div>
                    
                    <div className="text-sm text-gray-600 flex gap-4">
                      <span>📅 {formatBrazilDate(item.date)}</span>
                      <span>🏷️ {item.category}</span>
                      <span>🏦 {item.bank}</span>
                      {item.source && <span>📁 {item.source}</span>}
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-1">
                      Criado em: {formatBrazilDateTime(item.created_at)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        item.type === 'entrada' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.type === 'entrada' ? '+' : '-'} {Number(item.amount).toLocaleString('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        })}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
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
                            <AlertDialogTitle>Excluir Lançamento</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteMutation.mutate(item.id)}
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

      {/* Modals */}
      <NewEntryModal
        isOpen={showNewEntryModal}
        onClose={() => setShowNewEntryModal(false)}
        onSuccess={refetch}
      />

      <EditEntryModal
        isOpen={!!editingItem}
        onClose={handleCloseEditModal}
        item={editingItem}
        onSuccess={refetch}
        userId={user?.id || ''}
      />
    </div>
  );
};

export default Lancamentos;
