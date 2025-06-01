
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { RecurringBill, BillFormData } from "./types";

export const useBillForm = (editingBill: RecurringBill | null, onSubmit: (data: any) => void) => {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<BillFormData>(() => {
    console.log("🔧 BillForm - Inicializando formData");
    
    // Convert empty bank to "NONE" for proper Select handling
    const bankValue = editingBill?.bank || "";
    const safeBankValue = bankValue === "" ? "NONE" : bankValue;
    
    const initialData = {
      name: editingBill?.name || '',
      value: editingBill?.value?.toString() || '',
      due_date: editingBill?.due_date?.toString() || '',
      category: editingBill?.category || '',
      bank: safeBankValue,
      recurring: editingBill?.recurring ?? true
    };
    
    console.log("🔧 BillForm - Dados iniciais:", initialData);
    return initialData;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🔧 BillForm - handleSubmit chamado com:", formData);
    
    if (!formData.name || !formData.value || !formData.due_date || !formData.category) {
      console.log("🔧 BillForm - Validação falhou");
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, valor, data de vencimento e categoria.",
        variant: "destructive",
      });
      return;
    }

    // Convert "NONE" back to empty string for submission
    const submitData = {
      ...formData,
      bank: formData.bank === "NONE" ? "" : formData.bank
    };

    console.log("🔧 BillForm - Enviando dados para onSubmit:", submitData);
    onSubmit(submitData);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    console.log(`🔧 BillForm - Alterando ${field} para:`, value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return {
    formData,
    handleSubmit,
    handleInputChange
  };
};
