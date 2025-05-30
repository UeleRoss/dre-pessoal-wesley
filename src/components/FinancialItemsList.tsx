
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import SelectionControls from "./SelectionControls";
import FinancialItemRow from "./FinancialItemRow";
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

interface FinancialItemsListProps {
  filteredItems: FinancialItem[];
  allItems: FinancialItem[];
  selectedItems: string[];
  searchTerm: string;
  filterType: string;
  filterCategory: string;
  filterBank: string;
  onSelectItem: (itemId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onSelectAllComplete: (checked: boolean) => void;
  onEdit: (item: FinancialItem) => void;
  onDelete: (id: string) => void;
  onDeleteSelected: () => void;
}

const FinancialItemsList = ({
  filteredItems,
  allItems,
  selectedItems,
  searchTerm,
  filterType,
  filterCategory,
  filterBank,
  onSelectItem,
  onSelectAll,
  onSelectAllComplete,
  onEdit,
  onDelete,
  onDeleteSelected
}: FinancialItemsListProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Lançamentos Financeiros</CardTitle>
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedItems.length} selecionado{selectedItems.length > 1 ? 's' : ''}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar Selecionados
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Lançamentos</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir {selectedItems.length} lançamento{selectedItems.length > 1 ? 's' : ''}? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={onDeleteSelected}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg font-medium">Nenhum lançamento encontrado</p>
            <p className="text-sm">
              {searchTerm || filterType !== "all" || filterCategory !== "all" || filterBank !== "all"
                ? "Tente ajustar os filtros para ver mais resultados"
                : "Adicione seu primeiro lançamento financeiro"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <SelectionControls
              selectedItems={selectedItems}
              filteredItems={filteredItems}
              allItems={allItems}
              onSelectAll={onSelectAll}
              onSelectAllComplete={onSelectAllComplete}
            />

            {filteredItems.map((item) => (
              <FinancialItemRow
                key={item.id}
                item={item}
                isSelected={selectedItems.includes(item.id)}
                onSelect={onSelectItem}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinancialItemsList;
