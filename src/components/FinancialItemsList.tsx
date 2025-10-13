
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
  
  // Debug logs
  console.log("📋 Lista recebeu:", {
    filteredItems: filteredItems.length,
    entradas: filteredItems.filter(item => item.type === 'entrada').length,
    saidas: filteredItems.filter(item => item.type === 'saida').length,
    receitas: filteredItems.filter(item => item.source === 'financial_summary_income').length
  });
  
  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle className="text-base md:text-lg">Lançamentos Financeiros</CardTitle>
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs md:text-sm text-gray-600">
                {selectedItems.length} selecionado{selectedItems.length > 1 ? 's' : ''}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="flex-1 sm:flex-none text-xs md:text-sm h-8 md:h-9">
                    <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Deletar Selecionados</span>
                    <span className="sm:hidden">Deletar</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[90vw] md:max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-base md:text-lg">Excluir Lançamentos</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">
                      Tem certeza que deseja excluir {selectedItems.length} lançamento{selectedItems.length > 1 ? 's' : ''}? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col md:flex-row gap-2">
                    <AlertDialogCancel className="w-full md:w-auto">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDeleteSelected}
                      className="bg-red-600 hover:bg-red-700 w-full md:w-auto"
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
      <CardContent className="p-3 md:p-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-gray-500">
            <p className="text-base md:text-lg font-medium">Nenhum lançamento encontrado</p>
            <p className="text-xs md:text-sm mt-1">
              {searchTerm || filterType !== "all" || filterCategory !== "all" || filterBank !== "all"
                ? "Tente ajustar os filtros para ver mais resultados"
                : "Adicione seu primeiro lançamento financeiro"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2 md:space-y-3">
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
