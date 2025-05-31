
import { useToast } from "@/hooks/use-toast";
import { FinancialItem } from "@/types/financial";

interface FinancialItemActionsProps {
  setEditingItem: (item: FinancialItem | null) => void;
  setSelectedItems: (items: string[]) => void;
  deleteMutation: any;
  deleteMultipleMutation: any;
  selectedItems: string[];
}

export const useFinancialItemActions = ({
  setEditingItem,
  setSelectedItems,
  deleteMutation,
  deleteMultipleMutation,
  selectedItems
}: FinancialItemActionsProps) => {
  const { toast } = useToast();

  const handleEdit = (item: FinancialItem) => {
    // Não permitir editar resumos mensais ou resumos de receitas
    if (item.source === 'financial_summary' || item.source === 'financial_summary_income') {
      const type = item.source === 'financial_summary' ? 'gastos' : 'receitas';
      toast({
        title: "Aviso",
        description: `Resumos mensais de ${type} não podem ser editados individualmente. Use a importação para ajustar.`,
        variant: "destructive",
      });
      return;
    }
    setEditingItem(item);
  };

  const handleCloseEditModal = () => {
    setEditingItem(null);
  };

  const handleDeleteSelected = () => {
    console.log("Deletando itens selecionados:", selectedItems.length, "itens");
    if (selectedItems.length > 0) {
      deleteMultipleMutation.mutate(selectedItems);
    } else {
      toast({
        title: "Aviso",
        description: "Nenhum item selecionado para deletar",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return {
    handleEdit,
    handleCloseEditModal,
    handleDeleteSelected,
    handleDelete
  };
};
