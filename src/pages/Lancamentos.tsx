
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Auth from "@/components/Auth";
import NewEntryModal from "@/components/NewEntryModal";
import EditEntryModal from "@/components/EditEntryModal";
import LancamentosHeader from "@/components/LancamentosHeader";
import LancamentosFilters from "@/components/LancamentosFilters";
import FinancialItemsList from "@/components/FinancialItemsList";
import FinancialSummaryCards from "@/components/FinancialSummaryCards";
import BankCard from "@/components/BankCard";
import BankBalanceManager from "@/components/BankBalanceManager";
import { useFinancialData } from "@/hooks/useFinancialData";
import { useLancamentosState } from "@/hooks/useLancamentosState";
import { useFinancialItemActions } from "@/components/FinancialItemActions";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const BANKS = ['CONTA SIMPLES', 'BRADESCO', 'C6 BANK', 'ASAAS', 'NOMAD'];
const CATEGORIES = [
  "Carro", "Comida", "Contas Mensais", "Entre bancos", "Escritório", 
  "Estudos", "Go On Outdoor", "Imposto", "Investimentos", "Lazer e ócio", 
  "Pro-Labore", "Vida esportiva", "Anúncios Online", "Itens Físicos"
];

const Lancamentos = () => {
  const [user, setUser] = useState<any>(null);
  const [showBankSetup, setShowBankSetup] = useState(false);

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

  // Buscar saldos iniciais dos bancos
  const { data: bankBalances = [] } = useQuery({
    queryKey: ['bank-balances'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('bank_balances')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Buscar todos os bancos únicos que o usuário possui OU que foram configurados
  const { data: availableBanks = [] } = useQuery({
    queryKey: ['available-banks', user?.id, bankBalances],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Buscar bancos dos lançamentos existentes
      const { data: itemsBanks, error } = await supabase
        .from('financial_items')
        .select('bank')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const banksFromItems = [...new Set(itemsBanks.map(item => item.bank))].filter(Boolean);
      const banksFromBalances = bankBalances.map(balance => balance.bank_name);
      
      // Combinar bancos dos lançamentos e bancos configurados
      const allBanks = [...new Set([...banksFromItems, ...banksFromBalances])];
      
      console.log("Bancos disponíveis:", allBanks);
      console.log("Bancos dos saldos:", banksFromBalances);
      
      return allBanks;
    },
    enabled: !!user?.id
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

  // Calcular saldos atuais dos bancos corrigido
  const calculateBankBalances = () => {
    console.log("Calculando saldos dos bancos...");
    console.log("Período selecionado:", periodType, selectedMonth);
    console.log("Itens financeiros do período:", financialItems.length);

    return availableBanks.map(bank => {
      // Saldo inicial configurado
      const bankConfig = bankBalances.find(b => b.bank_name === bank);
      const initialBalance = bankConfig?.initial_balance || 0;
      
      console.log(`\n=== Calculando saldo para ${bank} ===`);
      console.log("Saldo inicial configurado:", initialBalance);
      
      // Para calcular o saldo atual, considerar TODOS os lançamentos do banco até agora
      // independente do período selecionado na tela
      let allBankItems = allItems.filter(item => item.bank === bank && item.source !== 'financial_summary' && item.source !== 'financial_summary_income');
      
      console.log("Total de lançamentos deste banco (todos os períodos):", allBankItems.length);
      
      // Calcular o saldo baseado em TODOS os lançamentos
      const totalMovement = allBankItems.reduce((sum, item) => {
        const amount = item.type === 'entrada' ? item.amount : -item.amount;
        console.log(`  ${item.date}: ${item.type} ${item.amount} (${item.description}) = ${amount}`);
        return sum + amount;
      }, 0);
      
      console.log("Movimento total de todos os tempos:", totalMovement);
      
      // Saldo atual = saldo inicial + todos os movimentos
      const currentBalance = initialBalance + totalMovement;
      
      console.log("Saldo atual calculado:", currentBalance);
      
      // Para calcular a mudança, vamos usar apenas os itens do período atual
      const periodBankItems = financialItems.filter(item => item.bank === bank && item.source !== 'financial_summary' && item.source !== 'financial_summary_income');
      const periodMovement = periodBankItems.reduce((sum, item) => {
        return item.type === 'entrada' ? sum + item.amount : sum - item.amount;
      }, 0);
      
      // O saldo anterior seria o saldo atual menos o movimento do período
      const previousBalance = currentBalance - periodMovement;
      
      console.log("Movimento do período atual:", periodMovement);
      console.log("Saldo anterior (calculado):", previousBalance);
      
      return {
        name: bank,
        balance: currentBalance,
        previousBalance: previousBalance
      };
    });
  };

  const filteredItems = getFilteredItems(financialItems);
  const calculatedBankBalances = calculateBankBalances();

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

      {/* Bank Balances Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-navy-800">Saldos por Banco</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBankSetup(true)}
            className="text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            Setup
          </Button>
        </div>
        
        {calculatedBankBalances.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {calculatedBankBalances.map((bank) => (
              <BankCard
                key={bank.name}
                name={bank.name}
                balance={bank.balance}
                previousBalance={bank.previousBalance}
                className="text-xs p-3"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            <p>Configure os saldos iniciais dos bancos para visualizar o resumo</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBankSetup(true)}
              className="mt-2"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar Saldos
            </Button>
          </div>
        )}
      </div>

      {/* Bank Setup Modal */}
      {showBankSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Setup de Saldos dos Bancos</h2>
                <Button variant="ghost" onClick={() => setShowBankSetup(false)}>×</Button>
              </div>
              <BankBalanceManager />
            </div>
          </div>
        </div>
      )}

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
