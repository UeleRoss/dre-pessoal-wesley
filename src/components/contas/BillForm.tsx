
import ErrorBoundary from "@/components/ErrorBoundary";
import { BillFormProps } from "./types";
import { useBillForm } from "./useBillForm";
import { BillFormFields } from "./BillFormFields";
import { BillFormActions } from "./BillFormActions";

const BillFormContent = ({ editingBill, onSubmit, onCancel }: BillFormProps) => {
  console.log("🔧 BillForm - INICIANDO RENDERIZAÇÃO");
  console.log("🔧 BillForm - editingBill:", editingBill);
  
  const { formData, handleSubmit, handleInputChange } = useBillForm(editingBill, onSubmit);

  console.log("🔧 BillForm - formData atual:", formData);
  console.log("🔧 BillForm - Renderizando JSX");

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <BillFormFields formData={formData} onInputChange={handleInputChange} />
        <BillFormActions editingBill={editingBill} onCancel={onCancel} />
      </form>
    </div>
  );
};

const BillForm = (props: BillFormProps) => {
  return (
    <ErrorBoundary fallback={<div className="text-red-500 p-4">Erro no formulário. Verifique o console para detalhes.</div>}>
      <BillFormContent {...props} />
    </ErrorBoundary>
  );
};

export default BillForm;
