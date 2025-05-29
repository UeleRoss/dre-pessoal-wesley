import { useState, useEffect } from "react";
import { Plus, Filter, Download, Edit, Trash2, Search, Settings, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import NewEntryModal from "@/components/NewEntryModal";
import EditEntryModal from "@/components/EditEntryModal";
import BankManager from "@/components/BankManager";
import CategoryManager from "@/components/CategoryManager";
import Auth from "@/components/Auth";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Lancamentos = () => {
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBank, setSelectedBank] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
  const [isEditEntryModalOpen, setIsEditEntryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: financialItems = [], refetch } = useQuery({
    queryKey: ['financial-items', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  // Get unique values for filters
  const uniqueBanks = [...new Set(financialItems.map(item => item.bank))];
  const uniqueCategories = [...new Set(financialItems.map(item => item.category))];

  // Filter and sort items
  const filteredAndSortedItems = financialItems
    .filter(item => {
      const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.bank.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBank = selectedBank === "all" || item.bank === selectedBank;
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesType = selectedType === "all" || item.type === selectedType;
      
      return matchesSearch && matchesBank && matchesCategory && matchesType;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      
      let aValue: any = a[sortField as keyof typeof a];
      let bValue: any = b[sortField as keyof typeof b];
      
      // Tratamento especial para diferentes tipos de dados
      if (sortField === 'amount') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (sortField === 'date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }
      
      if (aValue < bValue) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Se já está ordenando por esse campo, inverte a direção
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Se é um campo novo, define como campo de ordenação e direção descendente
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return null;
    }
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelectedItems = new Set(selectedItems);
    if (checked) {
      newSelectedItems.add(itemId);
    } else {
      newSelectedItems.delete(itemId);
    }
    setSelectedItems(newSelectedItems);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allItemIds = new Set(filteredAndSortedItems.map(item => item.id));
      setSelectedItems(allItemIds);
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    const confirmMessage = `Tem certeza que deseja excluir ${selectedItems.size} lançamento(s) selecionado(s)?`;
    if (!confirm(confirmMessage)) return;
    
    try {
      console.log('Iniciando exclusão em lote...');
      console.log('Items selecionados:', Array.from(selectedItems));
      
      // Fazer exclusões uma por uma para evitar problemas com a consulta
      let deletedCount = 0;
      let errorCount = 0;
      
      for (const itemId of selectedItems) {
        console.log(`Excluindo item: ${itemId}`);
        
        const { error } = await supabase
          .from('financial_items')
          .delete()
          .eq('id', itemId)
          .eq('user_id', user.id); // Garantir que só exclua items do usuário atual
        
        if (error) {
          console.error(`Erro ao excluir item ${itemId}:`, error);
          errorCount++;
        } else {
          console.log(`Item ${itemId} excluído com sucesso`);
          deletedCount++;
        }
      }
      
      if (errorCount > 0) {
        toast({
          title: "Atenção",
          description: `${deletedCount} lançamento(s) excluído(s), ${errorCount} falharam`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sucesso",
          description: `${deletedCount} lançamento(s) excluído(s) com sucesso`,
        });
      }
      
      setSelectedItems(new Set());
      refetch();
      
    } catch (error) {
      console.error('Erro inesperado na exclusão em lote:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao excluir lançamentos",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;
    
    try {
      console.log(`Excluindo item individual: ${id}`);
      
      const { error } = await supabase
        .from('financial_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Garantir que só exclua items do usuário atual
      
      if (error) {
        console.error('Erro ao excluir lançamento:', error);
        toast({
          title: "Erro",
          description: "Erro ao excluir lançamento: " + error.message,
          variant: "destructive",
        });
      } else {
        console.log('Lançamento excluído com sucesso');
        toast({
          title: "Sucesso",
          description: "Lançamento excluído com sucesso",
        });
        refetch();
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao excluir lançamento",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsEditEntryModalOpen(true);
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Banco', 'Valor'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedItems.map(item => [
        item.date,
        `"${item.description}"`,
        item.type,
        item.category,
        item.bank,
        item.amount
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lancamentos.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const allFilteredSelected = filteredAndSortedItems.length > 0 && filteredAndSortedItems.every(item => selectedItems.has(item.id));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800">Lançamentos</h1>
          <p className="text-navy-600 mt-1">Todos os registros financeiros</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Configurações</SheetTitle>
                <SheetDescription>
                  Gerencie bancos e categorias
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <BankManager userId={user.id} />
                <CategoryManager userId={user.id} />
              </div>
            </SheetContent>
          </Sheet>
          
          <Button 
            className="bg-orange-500 hover:bg-orange-600"
            onClick={() => setIsNewEntryModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Lançamento
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          {selectedItems.size > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Selecionados ({selectedItems.size})
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-orange-500" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar lançamentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os bancos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os bancos</SelectItem>
                {[...new Set(financialItems.map(item => item.bank))].map(bank => (
                  <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {[...new Set(financialItems.map(item => item.category))].map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setSelectedBank("all");
                setSelectedCategory("all");
                setSelectedType("all");
                setSortField("");
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Lançamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Lançamentos ({filteredAndSortedItems.length})</span>
            {filteredAndSortedItems.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">
                  Selecionar todos
                </span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAndSortedItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4">
                <div className="w-16 h-16 bg-navy-100 rounded-full flex items-center justify-center mx-auto">
                  <Plus className="h-8 w-8 text-navy-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-navy-800 mb-2">Nenhum lançamento encontrado</h3>
              <p className="text-navy-600 mb-6">
                {searchTerm || selectedBank !== "all" || selectedCategory !== "all" || selectedType !== "all" 
                  ? "Tente ajustar os filtros para ver mais resultados."
                  : "Comece criando seu primeiro lançamento financeiro."
                }
              </p>
              {!(searchTerm || selectedBank !== "all" || selectedCategory !== "all" || selectedType !== "all") && (
                <Button 
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={() => setIsNewEntryModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Lançamento
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allFilteredSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('date')}
                        className="flex items-center gap-1 hover:text-orange-500 transition-colors"
                      >
                        Data
                        {getSortIcon('date')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('description')}
                        className="flex items-center gap-1 hover:text-orange-500 transition-colors"
                      >
                        Descrição
                        {getSortIcon('description')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('type')}
                        className="flex items-center gap-1 hover:text-orange-500 transition-colors"
                      >
                        Tipo
                        {getSortIcon('type')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('category')}
                        className="flex items-center gap-1 hover:text-orange-500 transition-colors"
                      >
                        Categoria
                        {getSortIcon('category')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('bank')}
                        className="flex items-center gap-1 hover:text-orange-500 transition-colors"
                      >
                        Banco
                        {getSortIcon('bank')}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        onClick={() => handleSort('amount')}
                        className="flex items-center gap-1 hover:text-orange-500 transition-colors ml-auto"
                      >
                        Valor
                        {getSortIcon('amount')}
                      </button>
                    </TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(item.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.description}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.type === 'entrada' ? 'default' : 'destructive'}
                          className={item.type === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        >
                          {item.type === 'entrada' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.bank}</TableCell>
                      <TableCell className={`text-right font-bold ${
                        item.type === 'entrada' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.type === 'entrada' ? '+' : '-'}
                        {item.amount.toLocaleString('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <NewEntryModal
        isOpen={isNewEntryModalOpen}
        onClose={() => setIsNewEntryModalOpen(false)}
        onSuccess={() => {
          refetch();
          setIsNewEntryModalOpen(false);
        }}
      />

      <EditEntryModal
        isOpen={isEditEntryModalOpen}
        onClose={() => setIsEditEntryModalOpen(false)}
        onSuccess={() => {
          refetch();
          setIsEditEntryModalOpen(false);
        }}
        item={editingItem}
        userId={user.id}
      />
    </div>
  );
};

export default Lancamentos;
