
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BillsListHeaderProps {
  sortField: 'due_date' | 'value' | null;
  sortDirection: 'asc' | 'desc';
  onSort: (field: 'due_date' | 'value') => void;
}

const BillsListHeader = ({ sortField, sortDirection, onSort }: BillsListHeaderProps) => {
  const getSortIcon = (field: 'due_date' | 'value') => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <h3 className="font-medium text-gray-900">Lista de Contas</h3>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSort('due_date')}
          className="flex items-center gap-2"
        >
          Data
          {getSortIcon('due_date')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSort('value')}
          className="flex items-center gap-2"
        >
          Valor
          {getSortIcon('value')}
        </Button>
      </div>
    </div>
  );
};

export default BillsListHeader;
