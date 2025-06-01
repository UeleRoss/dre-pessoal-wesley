
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Auth from "@/components/Auth";
import NewEntryModal from "@/components/NewEntryModal";
import EditEntryModal from "@/components/EditEntryModal";
import LancamentosHeader from "@/components/LancamentosHeader";
import LancamentosFilters from "@/components/LancamentosFilters";
import FinancialItemsList from "@/components/FinancialItemsList";
import FinancialSummaryCards from "@/components/FinancialSummaryCards";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useLancamentosState } from "@/hooks/useLancamentosState";
import { useFinancialItemActions } from "@/components/FinancialItemActions";

const BANKS = ['CONTA SIMPLES', 'BRADESCO', 'C6 BANK', 'ASAAS', 'NOMAD'];
const CATEGORIES = [
  "Carro", "Comida", "Contas Mensais", "Entre bancos", "Escritório", 
  "Estudos", "Go On Outdoor", "Imposto", "Investimentos", "Lazer e ócio", 
  "Pro-Labore", "Vida esportiva", "Anúncios Online", "Itens Físicos"
];

const Lancamentos = () => {
  const [user, setUser] = useState<any>(null);

  const {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterCategory,
    setFilterCategory,
    filterBank,
    setFilterBank,
    showNewEntryModal,
    setShowNewEntryModal,
    editingItem,
    setEditingItem,
    selectedMonth,
    setSelectedMonth,
    periodType,
    setPeriodType,
    selectedItems,
    setSelectedItems,
    handleClearFilters,
    handleSelectItem,
    handleSelectAll,
    handleSelectAllComplete,
    getFilteredItems
  } = useLancamentosState();

  const {
    financialItems,
    allItems,
    refetch,
    deleteMutation,
    deleteMultipleMutation
  } = useFinancialData(user, selectedMonth, periodType);

  const {
    handleEdit,
    handleCloseEditModal,
    handleDeleteSelected,
    handleDelete
  } = useFinancialItemActions({
    setEditingItem,
    setSelectedItems,
    deleteMutation,
    deleteMultipleMutation,
    selectedItems
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const filteredItems = getFilteredItems(financialItems);

  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <LancamentosHeader
        onNewEntry={() => setShowNewEntryModal(true)}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        periodType={periodType}
        onPeriodTypeChange={setPeriodType}
      />

      <FinancialSummaryCards items={financialItems} />

      <LancamentosFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterType={filterType}
        onTypeChange={setFilterType}
        filterCategory={filterCategory}
        onCategoryChange={setFilterCategory}
        filterBank={filterBank}
        onBankChange={setFilterBank}
        onClearFilters={handleClearFilters}
        categories={CATEGORIES}
        banks={BANKS}
      />

      <FinancialItemsList
        filteredItems={filteredItems}
        allItems={allItems}
        selectedItems={selectedItems}
        searchTerm={searchTerm}
        filterType={filterType}
        filterCategory={filterCategory}
        filterBank={filterBank}
        onSelectItem={handleSelectItem}
        onSelectAll={(checked) => handleSelectAll(filteredItems, checked)}
        onSelectAllComplete={(checked) => handleSelectAllComplete(allItems, checked)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDeleteSelected={handleDeleteSelected}
      />

      <NewEntryModal
        isOpen={showNewEntryModal}
        onClose={() => setShowNewEntryModal(false)}
        onSuccess={refetch}
      />

      <EditEntryModal
        isOpen={!!editingItem}
        onClose={handleCloseEditModal}
        item={editingItem}
        onSuccess={refetch}
        userId={user?.id || ''}
      />
    </div>
  );
};

export default Lancamentos;
