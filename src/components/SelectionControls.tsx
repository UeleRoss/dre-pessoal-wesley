
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
    <div className="flex flex-col gap-2 p-4 border-b bg-gray-50 rounded">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
          onCheckedChange={onSelectAll}
        />
        <span className="text-sm font-medium">
          Selecionar todos do mês atual ({filteredItems.length})
        </span>
      </div>
      
      <div className="flex items-center gap-3">
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
