
import { useState } from "react";
import MonthSelector from "@/components/MonthSelector";
import BankCard from "@/components/BankCard";
import SummaryCard from "@/components/SummaryCard";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Percent,
  PiggyBank,
  Target
} from "lucide-react";

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Mock data - will be replaced with real data later
  const bankBalances = [
    { name: "CONTA SIMPLES", balance: 15420.50, previousBalance: 12300.00 },
    { name: "BRADESCO", balance: 8750.30, previousBalance: 9200.00 },
    { name: "C6 BANK", balance: 12340.80, previousBalance: 11800.00 },
    { name: "ASAAS", balance: 5680.20, previousBalance: 4900.00 },
    { name: "NOMAD", balance: 3240.15, previousBalance: 3100.00 },
  ];

  const totalBalance = bankBalances.reduce((sum, bank) => sum + bank.balance, 0);
  const previousTotalBalance = bankBalances.reduce((sum, bank) => sum + (bank.previousBalance || 0), 0);

  // Mock financial data
  const monthlyData = {
    totalRevenue: 45800.00,
    totalExpenses: 32150.00,
    netProfit: 13650.00,
    contributionMargin: 29.80, // percentage
    marginWithoutInvestments: 35.20, // percentage
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Month Selector */}
      <MonthSelector 
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      {/* Bank Balances Section */}
      <div>
        <h2 className="text-2xl font-bold text-navy-800 mb-4">Saldos por Banco</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {bankBalances.map((bank) => (
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
            trend="up"
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
            value={8950.00}
            subtitle="Aportes do mês"
            icon={PiggyBank}
            trend="up"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-navy-800 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors duration-200">
            <div className="text-center">
              <DollarSign className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="font-medium text-navy-800">Novo Lançamento</p>
              <p className="text-sm text-navy-500">Registrar receita/despesa</p>
            </div>
          </button>
          
          <button className="p-4 bg-navy-50 hover:bg-navy-100 rounded-lg border border-navy-200 transition-colors duration-200">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-navy-600 mx-auto mb-2" />
              <p className="font-medium text-navy-800">Ver Análises</p>
              <p className="text-sm text-navy-500">Relatórios e gráficos</p>
            </div>
          </button>
          
          <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors duration-200">
            <div className="text-center">
              <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-navy-800">Contas Fixas</p>
              <p className="text-sm text-navy-500">Gerenciar recorrências</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
