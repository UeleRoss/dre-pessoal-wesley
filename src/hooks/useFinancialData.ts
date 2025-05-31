
import { useState, useEffect } from "react";
import { PeriodType } from "@/components/PeriodSelector";
import { FinancialItem } from "@/types/financial";
import { useAllFinancialItems, useFinancialItemsByPeriod } from "./useFinancialQueries";
import { useFinancialMutations } from "./useFinancialMutations";

export const useFinancialData = (user: any, selectedMonth: Date, periodType: PeriodType) => {
  const [allItems, setAllItems] = useState<FinancialItem[]>([]);

  // Buscar todos os lançamentos (para seleção completa)
  const { data: allFinancialItems = [] } = useAllFinancialItems(user);

  // Buscar lançamentos financeiros baseado no tipo de período
  const { data: financialItems = [], refetch } = useFinancialItemsByPeriod(user, selectedMonth, periodType);

  // Mutations para deletar
  const { deleteMutation, deleteMultipleMutation } = useFinancialMutations(allItems);

  useEffect(() => {
    setAllItems(allFinancialItems);
  }, [allFinancialItems]);

  return {
    financialItems,
    allItems,
    refetch,
    deleteMutation,
    deleteMultipleMutation
  };
};
