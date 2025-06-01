
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import BillForm from "./BillForm";

interface NewBillButtonProps {
  onSubmit: (formData: any) => void;
}

const NewBillButton = ({ onSubmit }: NewBillButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  console.log("🔧 NewBillButton - renderizando, isOpen:", isOpen);

  const handleSubmit = (formData: any) => {
    console.log("🔧 NewBillButton - handleSubmit chamado:", formData);
    onSubmit(formData);
    setIsOpen(false);
  };

  const handleCancel = () => {
    console.log("🔧 NewBillButton - handleCancel chamado");
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    console.log("🔧 NewBillButton - Dialog onOpenChange:", open);
    setIsOpen(open);
  };

  return (
    <>
      <Button 
        onClick={() => {
          console.log("🔧 NewBillButton - Botão clicado, abrindo modal");
          setIsOpen(true);
        }} 
        type="button"
      >
        <Plus className="h-4 w-4 mr-2" />
        Nova Conta
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conta Recorrente</DialogTitle>
          </DialogHeader>
          
          <BillForm
            editingBill={null}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NewBillButton;
