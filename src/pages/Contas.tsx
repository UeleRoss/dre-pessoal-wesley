
import Auth from "@/components/Auth";
import ContasSummaryCards from "@/components/contas/ContasSummaryCards";
import BillsList from "@/components/contas/BillsList";
import BankBalancesCard from "@/components/contas/BankBalancesCard";
import ContasModalHandlers from "@/components/contas/ContasModalHandlers";
import { useContasLogic } from "@/hooks/useContasLogic";

const Contas = () => {
  const {
    user,
    setUser,
    showNewBillModal,
    setShowNewBillModal,
    editingBill,
    setEditingBill,
    editingAdjustment,
    setEditingAdjustment,
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

  const handleSubmit = (formData: any) => {
    console.log("handleSubmit chamado com:", formData);
    console.log("editingBill:", editingBill);
    
    if (editingBill) {
      console.log("Atualizando conta existente");
      updateBillMutation.mutate({
        id: editingBill.id,
        data: {
          ...formData,
          value: parseFloat(formData.value),
          due_date: parseInt(formData.due_date),
          bank: formData.bank || '' // Permite banco vazio
        }
      });
      setEditingBill(null);
      setShowNewBillModal(false);
    } else {
      console.log("Criando nova conta");
      createBillMutation.mutate(formData);
    }
  };

  const handleEdit = (bill: any) => {
    console.log("Editando conta:", bill);
    setEditingBill(bill);
    setShowNewBillModal(true);
  };

  const handleAdjustValue = (billId: string, currentValue: number) => {
    console.log("Ajustando valor para conta:", billId, currentValue);
    setEditingAdjustment({ billId, currentValue });
  };

  const submitAdjustment = (value: number) => {
    if (!editingAdjustment) return;
    
    console.log("Submetendo ajuste:", editingAdjustment, value);
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

  console.log("*** Renderizando Contas - showNewBillModal:", showNewBillModal);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-navy-800">Contas Recorrentes</h1>
          <p className="text-navy-600 mt-1">Gerencie suas contas fixas e previsão de caixa</p>
        </div>
        
        <ContasModalHandlers
          showNewBillModal={showNewBillModal}
          setShowNewBillModal={setShowNewBillModal}
          editingBill={editingBill}
          setEditingBill={setEditingBill}
          editingAdjustment={editingAdjustment}
          setEditingAdjustment={setEditingAdjustment}
          onSubmit={handleSubmit}
          onAdjustValue={handleAdjustValue}
          submitAdjustment={submitAdjustment}
        />
      </div>

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
    </div>
  );
};

export default Contas;
