import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Auth from "@/components/Auth";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useLancamentosState } from "@/hooks/useLancamentosState";
import { useFinancialItemActions } from "@/components/FinancialItemActions";
import { useBankBalances } from "@/hooks/useBankBalances";
import LancamentosHeader from "./LancamentosHeader";
import LancamentosContent from "./LancamentosContent";

const LancamentosContainer = () => {
  const [user, setUser] = useState<any>(null);

  const lancamentosState = useLancamentosState();
  const { selectedMonth, periodType } = lancamentosState;

  const {
    financialItems,
    allItems,
    refetch,
    deleteMutation,
    deleteMultipleMutation
  } = useFinancialData(user, selectedMonth, periodType);

  const financialItemActions = useFinancialItemActions({
    setEditingItem: lancamentosState.setEditingItem,
    setSelectedItems: lancamentosState.setSelectedItems,
    deleteMutation,
    deleteMultipleMutation,
    selectedItems: lancamentosState.selectedItems
  });

  const { bankBalances, availableBanks } = useBankBalances(user);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <LancamentosHeader
          onNewEntry={() => lancamentosState.setShowNewEntryModal(true)}
          selectedMonth={selectedMonth}
          onMonthChange={lancamentosState.setSelectedMonth}
          periodType={periodType}
          onPeriodTypeChange={lancamentosState.setPeriodType}
          financialItems={financialItems}
        />

        <LancamentosContent
          user={user}
          financialItems={financialItems}
          allItems={allItems}
          bankBalances={bankBalances}
          availableBanks={availableBanks}
          selectedMonth={selectedMonth}
          refetch={refetch}
          lancamentosState={lancamentosState}
          financialItemActions={financialItemActions}
        />
      </div>
    </div>
  );
};

export default LancamentosContainer;
