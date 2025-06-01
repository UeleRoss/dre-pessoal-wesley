
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { RecurringBill, BillFormData } from "./types";
import { BANKS, CATEGORIES } from "./constants";

export const useBillForm = (editingBill: RecurringBill | null, onSubmit: (data: any) => void) => {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<BillFormData>(() => {
    console.log("🔧 BillForm - Inicializando formData");
    
    // Validar se a categoria existe na lista, senão usar string vazia
    const categoryValue = editingBill?.category && CATEGORIES.includes(editingBill.category) 
      ? editingBill.category 
      : '';
    
    // Validar se o banco existe na lista, senão usar string vazia
    const bankValue = editingBill?.bank && BANKS.includes(editingBill.bank) 
      ? editingBill.bank 
      : '';
    
    const initialData = {
      name: editingBill?.name || '',
      value: editingBill?.value?.toString() || '',
      due_date: editingBill?.due_date?.toString() || '',
      category: categoryValue,
      bank: bankValue,
      recurring: editingBill?.recurring ?? true
    };
    console.log("🔧 BillForm - Dados iniciais validados:", initialData);
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

    console.log("🔧 BillForm - Enviando dados para onSubmit");
    onSubmit(formData);
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
