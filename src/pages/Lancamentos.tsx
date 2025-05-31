import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Auth from "@/components/Auth";
import NewEntryModal from "@/components/NewEntryModal";
import EditEntryModal from "@/components/EditEntryModal";
import LancamentosHeader from "@/components/LancamentosHeader";
import LancamentosFilters from "@/components/LancamentosFilters";
import FinancialItemsList from "@/components/FinancialItemsList";

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

interface FinancialSummary {
  id: string;
  created_at: string;
  month: string;
  category: string;
  total_value: number;
  user_id: string;
}

// Função para converter resumo mensal em formato de item para exibição
const summaryToItem = (summary: FinancialSummary): FinancialItem => ({
  id: summary.id,
  created_at: summary.created_at,
  date: summary.month,
  type: 'saida', // Resumos são sempre saídas (gastos)
  amount: summary.total_value,
  description: `Resumo mensal - ${summary.category}`,
  category: summary.category,
  bank: 'RESUMO MENSAL',
  source: 'financial_summary',
  user_id: summary.user_id
});

const BANKS = ['CONTA SIMPLES', 'BRADESCO', 'C6 BANK', 'ASAAS', 'NOMAD'];
const CATEGORIES = [
  "Carro", "Comida", "Contas Mensais", "Entre bancos", "Escritório", 
  "Estudos", "Go On Outdoor", "Imposto", "Investimentos", "Lazer e ócio", 
  "Pro-Labore", "Vida esportiva", "Anúncios Online", "Itens Físicos"
];

const Lancamentos = () => {
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<FinancialItem[]>([]);
  const [allItems, setAllItems] = useState<FinancialItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBank, setFilterBank] = useState("all");
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FinancialItem | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

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

  // Buscar todos os lançamentos (para seleção completa)
  const { data: allFinancialItems = [] } = useQuery({
    queryKey: ['all-financial-items'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Também buscar resumos mensais
      const { data: summaries, error: summariesError } = await supabase
        .from('financial_summary')
        .select('*')
        .order('month', { ascending: false });
      
      if (summariesError) throw summariesError;
      
      // Converter resumos para formato de item e combinar
      const summaryItems = summaries?.map(summaryToItem) || [];
      const combined = [...(data || []), ...summaryItems];
      
      // Ordenar por data
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setAllItems(combined);
      return combined;
    },
    enabled: !!user
  });

  // Buscar lançamentos financeiros do mês selecionado
  const { data: financialItems = [], refetch } = useQuery({
    queryKey: ['financial-items', selectedMonth.getMonth(), selectedMonth.getFullYear()],
    queryFn: async () => {
      if (!user) return [];
      
      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
      
      // Buscar lançamentos detalhados
      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Buscar resumos mensais do mesmo período
      const monthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-01`;
      const { data: summaries, error: summariesError } = await supabase
        .from('financial_summary')
        .select('*')
        .eq('month', monthStr);
      
      if (summariesError) throw summariesError;
      
      // Converter resumos para formato de item e combinar
      const summaryItems = summaries?.map(summaryToItem) || [];
      const combined = [...(data || []), ...summaryItems];
      
      // Ordenar por data
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setItems(combined);
      return combined;
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
      queryClient.invalidateQueries({ queryKey: ['all-financial-items'] });
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
      queryClient.invalidateQueries({ queryKey: ['all-financial-items'] });
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
      queryClient.invalidateQueries({ queryKey: ['all-financial-items'] });
    }
  });

  const deleteMultipleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      console.log("Tentando deletar IDs:", ids.length, "itens");
      
      if (ids.length === 0) {
        throw new Error("Nenhum item selecionado para deletar");
      }

      // Separar IDs de financial_items dos de financial_summary
      const itemsToDelete = allItems.filter(item => ids.includes(item.id));
      const financialItemIds = itemsToDelete.filter(item => item.source !== 'financial_summary').map(item => item.id);
      const summaryIds = itemsToDelete.filter(item => item.source === 'financial_summary').map(item => item.id);

      let totalDeleted = 0;

      // Deletar financial_items
      if (financialItemIds.length > 0) {
        const batchSize = 50;
        const batches = [];
        
        for (let i = 0; i < financialItemIds.length; i += batchSize) {
          batches.push(financialItemIds.slice(i, i + batchSize));
        }

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          console.log(`Deletando lote ${i + 1}/${batches.length} de financial_items com ${batch.length} itens`);
          
          const { error, count } = await supabase
            .from('financial_items')
            .delete()
            .in('id', batch);
          
          if (error) {
            console.error(`Erro no lote ${i + 1}:`, error);
            throw error;
          }
          
          totalDeleted += count || 0;
        }
      }

      // Deletar financial_summary
      if (summaryIds.length > 0) {
        console.log(`Deletando ${summaryIds.length} resumos mensais`);
        
        const { error, count } = await supabase
          .from('financial_summary')
          .delete()
          .in('id', summaryIds);
        
        if (error) {
          console.error("Erro ao deletar resumos:", error);
          throw error;
        }
        
        totalDeleted += count || 0;
      }
      
      console.log(`Total final deletado: ${totalDeleted}`);
      return { totalDeleted };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['financial-items'] });
      queryClient.invalidateQueries({ queryKey: ['all-financial-items'] });
      setSelectedItems([]);
      toast({
        title: "Sucesso",
        description: `${data.totalDeleted} lançamentos deletados com sucesso!`,
      });
    },
    onError: (error: any) => {
      console.error("Erro na mutação de deletar múltiplos:", error);
      toast({
        title: "Erro",
        description: "Erro ao deletar lançamentos: " + (error.message || "Erro desconhecido"),
        variant: "destructive",
      });
    }
  });

  const handleEdit = (item: FinancialItem) => {
    // Não permitir editar resumos mensais
    if (item.source === 'financial_summary') {
      toast({
        title: "Aviso",
        description: "Resumos mensais não podem ser editados individualmente. Use a importação para ajustar.",
        variant: "destructive",
      });
      return;
    }
    setEditingItem(item);
  };

  const handleCloseEditModal = () => {
    setEditingItem(null);
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(filteredItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectAllComplete = (checked: boolean) => {
    console.log("Selecionando todos da base:", checked, "Total de itens:", allItems.length);
    if (checked) {
      const allIds = allItems.map(item => item.id);
      console.log("IDs selecionados:", allIds);
      setSelectedItems(allIds);
    } else {
      setSelectedItems([]);
    }
  };

  const handleDeleteSelected = () => {
    console.log("Deletando itens selecionados:", selectedItems.length, "itens");
    if (selectedItems.length > 0) {
      deleteMultipleMutation.mutate(selectedItems);
    } else {
      toast({
        title: "Aviso",
        description: "Nenhum item selecionado para deletar",
        variant: "destructive",
      });
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterCategory("all");
    setFilterBank("all");
  };

  const filteredItems = financialItems.filter(item => {
    const searchTermLower = searchTerm.toLowerCase();
    const descriptionMatches = item.description.toLowerCase().includes(searchTermLower);
    const categoryMatches = filterCategory === "all" || item.category === filterCategory;
    const typeMatches = filterType === "all" || item.type === filterType;
    const bankMatches = filterBank === "all" || item.bank === filterBank;

    return descriptionMatches && categoryMatches && typeMatches && bankMatches;
  });

  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <LancamentosHeader
        onNewEntry={() => setShowNewEntryModal(true)}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      <LancamentosFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterType={filterType}
        onTypeChange={setFilterType}
        filterCategory={filterCategory}
        onCategoryChange={setFilterCategory}
        filterBank={filterBank}
        onBankChange={setFilterBank}
        onClearFilters={handleClearFilters}
        categories={CATEGORIES}
        banks={BANKS}
      />

      <FinancialItemsList
        filteredItems={filteredItems}
        allItems={allItems}
        selectedItems={selectedItems}
        searchTerm={searchTerm}
        filterType={filterType}
        filterCategory={filterCategory}
        filterBank={filterBank}
        onSelectItem={handleSelectItem}
        onSelectAll={handleSelectAll}
        onSelectAllComplete={handleSelectAllComplete}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
        onDeleteSelected={handleDeleteSelected}
      />

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
