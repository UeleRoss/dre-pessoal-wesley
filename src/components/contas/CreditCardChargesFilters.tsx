
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface FiltersState {
  card: string;
  type: string;
  status: string;
}

interface CreditCardChargesFiltersProps {
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
}

const CreditCardChargesFilters = ({ filters, onFiltersChange }: CreditCardChargesFiltersProps) => {
  const updateFilter = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
      <div>
        <Label htmlFor="card-filter">Cartão</Label>
        <Select
          value={filters.card}
          onValueChange={(value) => updateFilter('card', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos os cartões" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cartões</SelectItem>
            <SelectItem value="C6 Pessoal">C6 Pessoal</SelectItem>
            <SelectItem value="Conta Simples Empresa">Conta Simples Empresa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="type-filter">Tipo</Label>
        <Select
          value={filters.type}
          onValueChange={(value) => updateFilter('type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="recorrente">Recorrente</SelectItem>
            <SelectItem value="parcelado">Parcelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="status-filter">Status</Label>
        <Select
          value={filters.status}
          onValueChange={(value) => updateFilter('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CreditCardChargesFilters;
