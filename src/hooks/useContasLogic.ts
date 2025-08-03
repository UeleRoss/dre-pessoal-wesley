import { useContasState } from "./contas/useContasState";
import { useContasBills } from "./contas/useContasBills";
import { useContasMutations } from "./contas/useContasMutations";
import { useContasCalculations } from "./contas/useContasCalculations";

export const useContasLogic = (selectedMonth: Date) => {
  // Estados da interface
  const {
    user,
    setUser,
    showNewBillModal,
    setShowNewBillModal,
    editingBill,
    setEditingBill,
    editingAdjustment,
    setEditingAdjustment
  } = useContasState();

  // Dados das contas
  const {
    bills,
    billInstances,
    billAdjustments,
    userBanks,
    currentMonthKey,
    getCurrentBillValue,
    isBillPaidThisMonth,
    getBillsWithMonthlyData
  } = useContasBills(user, selectedMonth);

  // Mutations
  const {
    createBillMutation,
    updateBillMutation,
    adjustBillMutation,
    deleteBillMutation,
    togglePaidMutation
  } = useContasMutations(user, currentMonthKey);

  // Cálculos
  const billsWithMonthlyData = getBillsWithMonthlyData();
  const {
    bankBalances,
    monthlyItems,
    calculateCurrentBalances,
    calculateTotals
  } = useContasCalculations(user, selectedMonth, billsWithMonthlyData, userBanks);

  return {
    user,
    setUser,
    showNewBillModal,
    setShowNewBillModal,
    editingBill,
    setEditingBill,
    editingAdjustment,
    setEditingAdjustment,
    bills: billsWithMonthlyData,
    billAdjustments: [], // Não usado mais, mas mantido para compatibilidade
    bankBalances,
    monthlyItems,
    billInstances,
    userBanks,
    createBillMutation,
    updateBillMutation,
    adjustBillMutation,
    deleteBillMutation,
    togglePaidMutation,
    getCurrentBillValue,
    isBillPaidThisMonth,
    calculateCurrentBalances,
    calculateTotals
  };
};