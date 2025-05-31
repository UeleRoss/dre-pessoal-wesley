
import { useToast } from "@/hooks/use-toast";

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
    // Não permitir editar resumos mensais
    if (item.source === 'financial_summary') {
      toast({
        title: "Aviso",
        description: "Resumos mensais não podem ser editados individualmente. Use a importação para ajustar.",
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
