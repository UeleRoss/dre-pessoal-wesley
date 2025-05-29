
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import MonthSelector from "@/components/MonthSelector";
import BankCard from "@/components/BankCard";
import SummaryCard from "@/components/SummaryCard";
import Auth from "@/components/Auth";
import NewEntryModal from "@/components/NewEntryModal";
import CSVImportModal from "@/components/CSVImportModal";
import BankBalanceManager from "@/components/BankBalanceManager";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Percent,
  PiggyBank,
  Target,
  LogOut,
  Upload,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [user, setUser] = useState<any>(null);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showBankSetup, setShowBankSetup] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Buscar lançamentos financeiros
  const { data: financialItems = [], refetch } = useQuery({
    queryKey: ['financial-items', selectedMonth.getMonth(), selectedMonth.getFullYear()],
    queryFn: async () => {
      if (!user) return [];
      
      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Buscar saldos iniciais dos bancos
  const { data: bankBalances = [] } = useQuery({
    queryKey: ['bank-balances'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('bank_balances')
        .select('*');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
  };

  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  // Calcular saldos atuais dos bancos
  const calculateBankBalances = () => {
    const banks = ['CONTA SIMPLES', 'BRADESCO', 'C6 BANK', 'ASAAS', 'NOMAD'];
    return banks.map(bank => {
      // Saldo inicial configurado
      const initialBalance = bankBalances.find(b => b.bank_name === bank)?.initial_balance || 0;
      
      // Movimentações deste banco no mês
      const bankItems = financialItems.filter(item => item.bank === bank);
      const monthMovement = bankItems.reduce((sum, item) => {
        return item.type === 'entrada' ? sum + item.amount : sum - item.amount;
      }, 0);
      
      // Saldo atual = saldo inicial + movimentações
      const currentBalance = initialBalance + monthMovement;
      
      return {
        name: bank,
        balance: currentBalance,
        previousBalance: initialBalance
      };
    });
  };

  const calculateMonthlyData = () => {
    const totalRevenue = financialItems
      .filter(item => item.type === 'entrada')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const totalExpenses = financialItems
      .filter(item => item.type === 'saida')
      .reduce((sum, item) => sum + item.amount, 0);
    
    const netProfit = totalRevenue - totalExpenses;
    const contributionMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      contributionMargin,
      marginWithoutInvestments: contributionMargin * 1.1,
    };
  };

  const calculatedBankBalances = calculateBankBalances();
  const totalBalance = calculatedBankBalances.reduce((sum, bank) => sum + bank.balance, 0);
  const previousTotalBalance = calculatedBankBalances.reduce((sum, bank) => sum + (bank.previousBalance || 0), 0);
  const monthlyData = calculateMonthlyData();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with logout */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Bem-vindo!</h1>
          <p className="text-navy-600">{user.email}</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>

      {/* Month Selector */}
      <MonthSelector 
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-navy-800 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <button 
            onClick={() => setShowNewEntryModal(true)}
            className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors duration-200"
          >
            <div className="text-center">
              <DollarSign className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="font-medium text-navy-800">Novo Lançamento</p>
              <p className="text-sm text-navy-500">Registrar receita/despesa</p>
            </div>
          </button>
          
          <button 
            onClick={() => setShowCSVModal(true)}
            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors duration-200"
          >
            <div className="text-center">
              <Upload className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-navy-800">Importar CSV</p>
              <p className="text-sm text-navy-500">Dados dos últimos 2 anos</p>
            </div>
          </button>

          <button 
            onClick={() => setShowBankSetup(true)}
            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors duration-200"
          >
            <div className="text-center">
              <Settings className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="font-medium text-navy-800">Setup Bancos</p>
              <p className="text-sm text-navy-500">Ajustar saldos iniciais</p>
            </div>
          </button>
          
          <button className="p-4 bg-navy-50 hover:bg-navy-100 rounded-lg border border-navy-200 transition-colors duration-200">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-navy-600 mx-auto mb-2" />
              <p className="font-medium text-navy-800">Ver Análises</p>
              <p className="text-sm text-navy-500">Relatórios e gráficos</p>
            </div>
          </button>
          
          <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors duration-200">
            <div className="text-center">
              <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="font-medium text-navy-800">Contas Fixas</p>
              <p className="text-sm text-navy-500">Gerenciar recorrências</p>
            </div>
          </button>
        </div>
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

      {/* Bank Balances Section */}
      <div>
        <h2 className="text-2xl font-bold text-navy-800 mb-4">Saldos por Banco</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {calculatedBankBalances.map((bank) => (
            <BankCard
              key={bank.name}
              name={bank.name}
              balance={bank.balance}
              previousBalance={bank.previousBalance}
            />
          ))}
        </div>
        
        {/* Total Balance Card */}
        <BankCard
          name="TOTAL EM CAIXA"
          balance={totalBalance}
          previousBalance={previousTotalBalance}
          className="md:max-w-md mx-auto border-l-orange-500"
        />
      </div>

      {/* Financial Summary Section */}
      <div>
        <h2 className="text-2xl font-bold text-navy-800 mb-4">Resumo Financeiro do Mês</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SummaryCard
            title="Receita Total"
            value={monthlyData.totalRevenue}
            subtitle="Entradas do mês"
            icon={DollarSign}
            trend="up"
          />
          
          <SummaryCard
            title="Despesa Total"
            value={monthlyData.totalExpenses}
            subtitle="Saídas do mês"
            icon={TrendingDown}
            trend="down"
          />
          
          <SummaryCard
            title="Lucro Líquido"
            value={monthlyData.netProfit}
            subtitle="Resultado do mês"
            icon={TrendingUp}
            trend={monthlyData.netProfit >= 0 ? "up" : "down"}
          />
          
          <SummaryCard
            title="Margem de Contribuição"
            value={monthlyData.contributionMargin}
            subtitle="Lucro / Receita"
            icon={Percent}
            trend="up"
            isPercentage={true}
          />
          
          <SummaryCard
            title="Margem sem Aportes"
            value={monthlyData.marginWithoutInvestments}
            subtitle="Excluindo investimentos"
            icon={Target}
            trend="up"
            isPercentage={true}
          />
          
          <SummaryCard
            title="Resultado Investimentos"
            value={2950.00}
            subtitle="Aportes do mês"
            icon={PiggyBank}
            trend="up"
          />
        </div>
      </div>

      {/* Modals */}
      <NewEntryModal
        isOpen={showNewEntryModal}
        onClose={() => setShowNewEntryModal(false)}
        onSuccess={refetch}
      />

      <CSVImportModal
        isOpen={showCSVModal}
        onClose={() => setShowCSVModal(false)}
        onSuccess={refetch}
      />
    </div>
  );
};

export default Dashboard;
