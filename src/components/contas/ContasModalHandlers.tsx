
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import BillForm from "./BillForm";
import ValueAdjustmentModal from "./ValueAdjustmentModal";

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

interface ContasModalHandlersProps {
  showNewBillModal: boolean;
  setShowNewBillModal: (show: boolean) => void;
  editingBill: RecurringBill | null;
  setEditingBill: (bill: RecurringBill | null) => void;
  editingAdjustment: {billId: string, currentValue: number} | null;
  setEditingAdjustment: (adjustment: {billId: string, currentValue: number} | null) => void;
  onSubmit: (formData: any) => void;
  onAdjustValue: (billId: string, currentValue: number) => void;
  submitAdjustment: (value: number) => void;
}

const ContasModalHandlers = ({
  showNewBillModal,
  setShowNewBillModal,
  editingBill,
  setEditingBill,
  editingAdjustment,
  setEditingAdjustment,
  onSubmit,
  onAdjustValue,
  submitAdjustment
}: ContasModalHandlersProps) => {
  const resetForm = () => {
    console.log("🔄 Resetando formulário");
    setEditingBill(null);
  };

  const handleNewBillClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🔥 BOTÃO NOVA CONTA CLICADO");
    console.log("📊 Estado atual:", {
      showNewBillModal,
      editingBill,
      event: e.type
    });
    
    resetForm();
    setShowNewBillModal(true);
    
    console.log("✅ Após setState - showNewBillModal deveria ser true");
  };

  const handleDialogChange = (open: boolean) => {
    console.log("🎯 Dialog onOpenChange:", open);
    console.log("📋 Estado anterior showNewBillModal:", showNewBillModal);
    
    setShowNewBillModal(open);
    
    if (!open) {
      console.log("❌ Fechando dialog - resetando form");
      resetForm();
    }
  };

  const handleFormSubmit = (formData: any) => {
    console.log("📝 ContasModalHandlers - handleFormSubmit chamado com:", formData);
    try {
      onSubmit(formData);
      console.log("✅ onSubmit executado com sucesso");
    } catch (error) {
      console.error("❌ Erro ao executar onSubmit:", error);
    }
  };

  const handleFormCancel = () => {
    console.log("🚫 ContasModalHandlers - handleFormCancel chamado");
    setShowNewBillModal(false);
    resetForm();
  };

  console.log("🎨 ContasModalHandlers renderizando:", {
    showNewBillModal,
    editingBill: !!editingBill,
    editingAdjustment: !!editingAdjustment
  });

  return (
    <>
      <Dialog open={showNewBillModal} onOpenChange={handleDialogChange}>
        <DialogTrigger asChild>
          <Button 
            onClick={handleNewBillClick} 
            type="button"
            className="pointer-events-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBill ? 'Editar Conta' : 'Nova Conta Recorrente'}</DialogTitle>
          </DialogHeader>
          
          <BillForm
            editingBill={editingBill}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>

      <ValueAdjustmentModal
        isOpen={!!editingAdjustment}
        onClose={() => setEditingAdjustment(null)}
        onSubmit={submitAdjustment}
        currentValue={editingAdjustment?.currentValue || 0}
      />
    </>
  );
};

export default ContasModalHandlers;
