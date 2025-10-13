
import { useState } from "react";
import { PeriodType } from "@/components/PeriodSelector";
import { FinancialItem } from "@/types/financial";

export const useLancamentosState = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBank, setFilterBank] = useState("all");
  const [filterBusinessUnit, setFilterBusinessUnit] = useState<string | null>(null);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FinancialItem | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterCategory("all");
    setFilterBank("all");
    setFilterBusinessUnit(null);
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleSelectAll = (filteredItems: FinancialItem[], checked: boolean) => {
    if (checked) {
      setSelectedItems(filteredItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectAllComplete = (allItems: FinancialItem[], checked: boolean) => {
    console.log("Selecionando todos da base:", checked, "Total de itens:", allItems.length);
    if (checked) {
      const allIds = allItems.map(item => item.id);
      console.log("IDs selecionados:", allIds);
      setSelectedItems(allIds);
    } else {
      setSelectedItems([]);
    }
  };

  const getFilteredItems = (items: FinancialItem[]) => {
    return items.filter(item => {
      const searchTermLower = searchTerm.toLowerCase();
      const descriptionMatches = item.description.toLowerCase().includes(searchTermLower);
      const categoryMatches = filterCategory === "all" || item.category === filterCategory;
      const typeMatches = filterType === "all" || item.type === filterType;
      const bankMatches = filterBank === "all" || item.bank === filterBank;
      const businessUnitMatches = filterBusinessUnit === null || item.business_unit_id === filterBusinessUnit;

      return descriptionMatches && categoryMatches && typeMatches && bankMatches && businessUnitMatches;
    });
  };

  return {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterCategory,
    setFilterCategory,
    filterBank,
    setFilterBank,
    filterBusinessUnit,
    setFilterBusinessUnit,
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
  };
};
