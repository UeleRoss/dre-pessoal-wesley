
import { Checkbox } from "@/components/ui/checkbox";

interface SelectionControlsProps {
  selectedItems: string[];
  filteredItems: any[];
  allItems: any[];
  onSelectAll: (checked: boolean) => void;
  onSelectAllComplete: (checked: boolean) => void;
}

const SelectionControls = ({
  selectedItems,
  filteredItems,
  allItems,
  onSelectAll,
  onSelectAllComplete
}: SelectionControlsProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border border-gray-200 bg-gray-50 rounded-md">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
          onCheckedChange={onSelectAll}
        />
        <span className="text-sm font-medium">
          Selecionar todos do mês atual ({filteredItems.length})
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          checked={selectedItems.length === allItems.length && allItems.length > 0}
          onCheckedChange={onSelectAllComplete}
        />
        <span className="text-sm font-medium text-red-600">
          Selecionar TODOS os lançamentos da base ({allItems.length})
        </span>
      </div>
    </div>
  );
};

export default SelectionControls;
