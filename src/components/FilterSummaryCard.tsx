
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter, TrendingUp, TrendingDown, Calculator } from "lucide-react";
import { FinancialItem } from "@/types/financial";

interface FilterSummaryCardProps {
  filteredItems: FinancialItem[];
  filterType: string;
  filterCategory: string;
  filterBank: string;
  searchTerm: string;
}

const FilterSummaryCard = ({ 
  filteredItems, 
  filterType, 
  filterCategory, 
  filterBank, 
  searchTerm 
}: FilterSummaryCardProps) => {
  // Verificar se há filtros ativos
  const hasActiveFilters = filterType !== "all" || 
                          filterCategory !== "all" || 
                          filterBank !== "all" || 
                          searchTerm.trim() !== "";

  // Se não há filtros ativos, não mostrar o card
  if (!hasActiveFilters) {
    return null;
  }

  // Calcular métricas
  const totalEntradas = filteredItems
    .filter(item => item.type === 'entrada')
    .reduce((sum, item) => sum + item.amount, 0);

  const totalSaidas = filteredItems
    .filter(item => item.type === 'saida')
    .reduce((sum, item) => sum + item.amount, 0);

  const saldoLiquido = totalEntradas - totalSaidas;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Construir texto dos filtros ativos
  const activeFilters = [];
  if (filterType !== "all") {
    activeFilters.push(`Tipo: ${filterType === 'entrada' ? 'Entrada' : 'Saída'}`);
  }
  if (filterCategory !== "all") {
    activeFilters.push(`Categoria: ${filterCategory}`);
  }
  if (filterBank !== "all") {
    activeFilters.push(`Banco: ${filterBank}`);
  }
  if (searchTerm.trim() !== "") {
    activeFilters.push(`Busca: "${searchTerm}"`);
  }

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Filter className="h-5 w-5" />
          Resumo dos Filtros Aplicados
        </CardTitle>
        <p className="text-sm text-blue-600">
          {activeFilters.join(" + ")} • {filteredItems.length} lançamento{filteredItems.length !== 1 ? 's' : ''}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total de Entradas */}
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="p-2 bg-green-100 rounded-full">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-800">Entradas</p>
              <p className="text-lg font-bold text-green-700">
                {formatCurrency(totalEntradas)}
              </p>
            </div>
          </div>

          {/* Total de Saídas */}
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="p-2 bg-red-100 rounded-full">
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800">Saídas</p>
              <p className="text-lg font-bold text-red-700">
                {formatCurrency(totalSaidas)}
              </p>
            </div>
          </div>

          {/* Saldo Líquido */}
          <div className={`flex items-center gap-3 p-3 rounded-lg border ${
            saldoLiquido >= 0 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className={`p-2 rounded-full ${
              saldoLiquido >= 0 
                ? 'bg-blue-100' 
                : 'bg-orange-100'
            }`}>
              <Calculator className={`h-4 w-4 ${
                saldoLiquido >= 0 
                  ? 'text-blue-600' 
                  : 'text-orange-600'
              }`} />
            </div>
            <div>
              <p className={`text-sm font-medium ${
                saldoLiquido >= 0 
                  ? 'text-blue-800' 
                  : 'text-orange-800'
              }`}>
                Saldo Líquido
              </p>
              <p className={`text-lg font-bold ${
                saldoLiquido >= 0 
                  ? 'text-blue-700' 
                  : 'text-orange-700'
              }`}>
                {formatCurrency(saldoLiquido)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterSummaryCard;
