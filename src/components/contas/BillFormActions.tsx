
import { Button } from "@/components/ui/button";
import { RecurringBill } from "./types";

interface BillFormActionsProps {
  editingBill: RecurringBill | null;
  onCancel: () => void;
}

export const BillFormActions = ({ editingBill, onCancel }: BillFormActionsProps) => {
  return (
    <div className="flex gap-2 pt-4">
      <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
        Cancelar
      </Button>
      <Button type="submit" className="flex-1">
        {editingBill ? 'Atualizar' : 'Salvar'}
      </Button>
    </div>
  );
};
