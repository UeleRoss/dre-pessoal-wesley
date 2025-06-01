
import Auth from "@/components/Auth";
import ContasSummaryCards from "@/components/contas/ContasSummaryCards";
import BillsList from "@/components/contas/BillsList";
import BankBalancesCard from "@/components/contas/BankBalancesCard";
import NewBillButton from "@/components/contas/NewBillButton";
import EditBillModal from "@/components/contas/EditBillModal";
import ValueAdjustmentModal from "@/components/contas/ValueAdjustmentModal";
import CreditCardChargesSection from "@/components/contas/CreditCardChargesSection";
import MonthSelector from "@/components/contas/MonthSelector";
import { useContasLogic } from "@/hooks/useContasLogic";
import { useState } from "react";

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

const Contas = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  const {
    user,
    setUser,
    bills,
    billAdjustments,
    createBillMutation,
    updateBillMutation,
    adjustBillMutation,
    deleteBillMutation,
    togglePaidMutation,
    calculateCurrentBalances,
    calculateTotals
  } = useContasLogic();

  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [editingAdjustment, setEditingAdjustment] = useState<{billId: string, currentValue: number} | null>(null);

  console.log("🔧 Contas página renderizada");

  const handleNewBillSubmit = (formData: any) => {
    console.log("🔧 Contas - handleNewBillSubmit:", formData);
    createBillMutation.mutate(formData);
  };

  const handleEditBillSubmit = (formData: any) => {
    console.log("🔧 Contas - handleEditBillSubmit:", formData);
    if (editingBill) {
      updateBillMutation.mutate({
        id: editingBill.id,
        data: {
          ...formData,
          value: parseFloat(formData.value),
          due_date: parseInt(formData.due_date),
          bank: formData.bank || ''
        }
      });
    }
  };

  const handleEdit = (bill: RecurringBill) => {
    console.log("🔧 Contas - handleEdit:", bill);
    setEditingBill(bill);
  };

  const handleCloseEdit = () => {
    console.log("🔧 Contas - handleCloseEdit");
    setEditingBill(null);
  };

  const handleAdjustValue = (billId: string, currentValue: number) => {
    console.log("🔧 Contas - handleAdjustValue:", billId, currentValue);
    setEditingAdjustment({ billId, currentValue });
  };

  const submitAdjustment = (value: number) => {
    if (!editingAdjustment) return;
    
    console.log("🔧 Contas - submitAdjustment:", editingAdjustment, value);
    adjustBillMutation.mutate({
      billId: editingAdjustment.billId,
      value: value
    });
  };

  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  const totals = calculateTotals();
  const currentBalances = calculateCurrentBalances();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-800">Contas Recorrentes</h1>
          <p className="text-navy-600 mt-1">Gerencie suas contas fixas e previsão de caixa</p>
        </div>
        
        <NewBillButton onSubmit={handleNewBillSubmit} />
      </div>

      <MonthSelector 
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      <ContasSummaryCards 
        totals={totals}
        billsCount={{
          total: bills.length,
          paid: bills.filter(b => b.paid_this_month).length
        }}
      />

      <BillsList
        bills={bills}
        billAdjustments={billAdjustments}
        onTogglePaid={(billId, paid) => togglePaidMutation.mutate({ id: billId, paid })}
        onEdit={handleEdit}
        onDelete={(billId) => deleteBillMutation.mutate(billId)}
        onAdjustValue={handleAdjustValue}
      />

      <BankBalancesCard
        currentBalances={currentBalances}
        bills={bills}
      />

      {/* Nova seção para cobranças do cartão de crédito */}
      <CreditCardChargesSection />

      <EditBillModal
        editingBill={editingBill}
        isOpen={!!editingBill}
        onClose={handleCloseEdit}
        onSubmit={handleEditBillSubmit}
      />

      <ValueAdjustmentModal
        isOpen={!!editingAdjustment}
        onClose={() => setEditingAdjustment(null)}
        onSubmit={submitAdjustment}
        currentValue={editingAdjustment?.currentValue || 0}
      />
    </div>
  );
};

export default Contas;
