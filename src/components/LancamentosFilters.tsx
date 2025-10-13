
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

interface LancamentosFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterType: string;
  onTypeChange: (value: string) => void;
  filterCategory: string;
  onCategoryChange: (value: string) => void;
  filterBank: string;
  onBankChange: (value: string) => void;
  onClearFilters: () => void;
  categories: string[];
  banks: string[];
}

const LancamentosFilters = ({
  searchTerm,
  onSearchChange,
  filterType,
  onTypeChange,
  filterCategory,
  onCategoryChange,
  filterBank,
  onBankChange,
  onClearFilters,
  categories,
  banks
}: LancamentosFiltersProps) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <div className="sm:col-span-2 md:col-span-1">
          <Input
            type="text"
            placeholder="Buscar por descrição..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full"
          />
        </div>

        <Select value={filterType} onValueChange={onTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filtrar por categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterBank} onValueChange={onBankChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filtrar por banco" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os bancos</SelectItem>
            {banks.map(bank => (
              <SelectItem key={bank} value={bank}>{bank}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="sm:col-span-2 md:col-span-1">
          <Button variant="outline" onClick={onClearFilters} className="w-full">
            <Filter className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LancamentosFilters;
