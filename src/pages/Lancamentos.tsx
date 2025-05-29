
import { useState, useEffect } from "react";
import { Plus, Filter, Download, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import NewEntryModal from "@/components/NewEntryModal";
import Auth from "@/components/Auth";
import { useToast } from "@/hooks/use-toast";

const Lancamentos = () => {
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBank, setSelectedBank] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
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

  // Filter items based on search and filters
  const filteredItems = financialItems.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.bank.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBank = selectedBank === "all" || item.bank === selectedBank;
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesType = selectedType === "all" || item.type === selectedType;
    
    return matchesSearch && matchesBank && matchesCategory && matchesType;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;
    
    const { error } = await supabase
      .from('financial_items')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir lançamento",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Lançamento excluído com sucesso",
      });
      refetch();
    }
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Banco', 'Valor'];
    const csvContent = [
      headers.join(','),
      ...filteredItems.map(item => [
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800">Lançamentos</h1>
          <p className="text-navy-600 mt-1">Todos os registros financeiros</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
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
                {uniqueBanks.map(bank => (
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
                {uniqueCategories.map(category => (
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
          <CardTitle>
            Lançamentos ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
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
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
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
    </div>
  );
};

export default Lancamentos;
