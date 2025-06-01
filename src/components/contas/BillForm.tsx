
import { BillFormProps } from "./types";
import { useBillForm } from "./useBillForm";
import { BillFormFields } from "./BillFormFields";
import { BillFormActions } from "./BillFormActions";

const BillForm = ({ editingBill, onSubmit, onCancel }: BillFormProps) => {
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

export default BillForm;
