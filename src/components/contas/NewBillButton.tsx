
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import BillForm from "./BillForm";

interface NewBillButtonProps {
  onSubmit: (formData: any) => void;
}

const NewBillButton = ({ onSubmit }: NewBillButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  console.log("🔧 NewBillButton - isOpen:", isOpen);

  const handleOpenChange = (open: boolean) => {
    console.log("🔧 NewBillButton - handleOpenChange:", open);
    setIsOpen(open);
  };

  const handleFormSubmit = (formData: any) => {
    console.log("🔧 NewBillButton - handleFormSubmit:", formData);
    onSubmit(formData);
    setIsOpen(false);
  };

  const handleFormCancel = () => {
    console.log("🔧 NewBillButton - handleFormCancel");
    setIsOpen(false);
  };

  const handleButtonClick = () => {
    console.log("🔧 NewBillButton - button clicked");
    setIsOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={handleButtonClick} type="button">
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Conta Recorrente</DialogTitle>
        </DialogHeader>
        
        <BillForm
          editingBill={null}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      </DialogContent>
    </Dialog>
  );
};

export default NewBillButton;
