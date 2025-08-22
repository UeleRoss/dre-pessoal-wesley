
import FinancialSummaryCards from "@/components/FinancialSummaryCards";
import LancamentosFilters from "@/components/LancamentosFilters";
import FinancialItemsList from "@/components/FinancialItemsList";
import NewEntryModal from "@/components/NewEntryModal";
import EditEntryModal from "@/components/EditEntryModal";
import ExportSelectedButton from "@/components/ExportSelectedButton";
import FilterSummaryCard from "@/components/FilterSummaryCard";

import { FinancialItem } from "@/types/financial";

const CATEGORIES = [
  "Apartamento", "Carro", "Comida", "Contas Mensais", "Entre bancos", "Escritório", 
  "Estudos", "Go On Outdoor", "Imposto", "Investimentos", "Lazer e ócio", 
  "Pro-Labore", "Vida esportiva", "Anúncios Online", "Itens Físicos"
];

const BANKS = ['CONTA SIMPLES', 'BRADESCO', 'C6 BANK', 'ASAAS', 'NOMAD'];

interface LancamentosContentProps {
  user: any;
  financialItems: FinancialItem[];
  allItems: FinancialItem[];
  selectedMonth: Date;
  refetch: () => void;
  lancamentosState: any;
  financialItemActions: any;
}

const LancamentosContent = ({
  user,
  financialItems,
  allItems,
  selectedMonth,
  refetch,
  lancamentosState,
  financialItemActions
}: LancamentosContentProps) => {
  const filteredItems = lancamentosState.getFilteredItems(financialItems);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Summary Cards */}
      <div className="animate-fade-in">
        <FinancialSummaryCards items={financialItems} />
      </div>


      {/* Filters */}
      <div className="animate-fade-in">
        <LancamentosFilters
          searchTerm={lancamentosState.searchTerm}
          onSearchChange={lancamentosState.setSearchTerm}
          filterType={lancamentosState.filterType}
          onTypeChange={lancamentosState.setFilterType}
          filterCategory={lancamentosState.filterCategory}
          onCategoryChange={lancamentosState.setFilterCategory}
          filterBank={lancamentosState.filterBank}
          onBankChange={lancamentosState.setFilterBank}
          onClearFilters={lancamentosState.handleClearFilters}
          categories={CATEGORIES}
          banks={BANKS}
        />
      </div>

      {/* Filter Summary Card - Show when filters are active */}
      <div className="animate-fade-in">
        <FilterSummaryCard
          filteredItems={filteredItems}
          filterType={lancamentosState.filterType}
          filterCategory={lancamentosState.filterCategory}
          filterBank={lancamentosState.filterBank}
          searchTerm={lancamentosState.searchTerm}
        />
      </div>

      {/* Export Selected Button - Show only when items are selected */}
      {lancamentosState.selectedItems.length > 0 && (
        <div className="animate-fade-in">
          <div className="flex justify-end">
            <ExportSelectedButton
              selectedItems={lancamentosState.selectedItems}
              allItems={allItems}
            />
          </div>
        </div>
      )}

      {/* Financial Items List */}
      <div className="animate-fade-in">
        <FinancialItemsList
          filteredItems={filteredItems}
          allItems={allItems}
          selectedItems={lancamentosState.selectedItems}
          searchTerm={lancamentosState.searchTerm}
          filterType={lancamentosState.filterType}
          filterCategory={lancamentosState.filterCategory}
          filterBank={lancamentosState.filterBank}
          onSelectItem={lancamentosState.handleSelectItem}
          onSelectAll={(checked) => lancamentosState.handleSelectAll(filteredItems, checked)}
          onSelectAllComplete={(checked) => lancamentosState.handleSelectAllComplete(allItems, checked)}
          onEdit={financialItemActions.handleEdit}
          onDelete={financialItemActions.handleDelete}
          onDeleteSelected={financialItemActions.handleDeleteSelected}
        />
      </div>

      {/* Modals */}
      <NewEntryModal
        isOpen={lancamentosState.showNewEntryModal}
        onClose={() => lancamentosState.setShowNewEntryModal(false)}
        onSuccess={refetch}
      />

      <EditEntryModal
        isOpen={!!lancamentosState.editingItem}
        onClose={financialItemActions.handleCloseEditModal}
        item={lancamentosState.editingItem}
        onSuccess={refetch}
        userId={user?.id || ''}
      />
    </div>
  );
};

export default LancamentosContent;
