
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BillForm from "./BillForm";

interface RecurringBill {
  id: string;
  name: string;
  value: number;
  due_date: number;
  category: string;
  bank: string;
  recurring: boolean;
  paid_this_month: boolean;
}

interface EditBillModalProps {
  editingBill: RecurringBill | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => void;
}

const EditBillModal = ({ editingBill, isOpen, onClose, onSubmit }: EditBillModalProps) => {
  console.log("🔧 EditBillModal - isOpen:", isOpen, "editingBill:", editingBill);

  const handleFormSubmit = (formData: any) => {
    console.log("🔧 EditBillModal - handleFormSubmit:", formData);
    onSubmit(formData);
    onClose();
  };

  const handleFormCancel = () => {
    console.log("🔧 EditBillModal - handleFormCancel");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Conta</DialogTitle>
        </DialogHeader>
        
        <BillForm
          editingBill={editingBill}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditBillModal;
