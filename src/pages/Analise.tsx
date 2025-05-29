import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, PieChart, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart as RechartsPieChart, Cell, LineChart, Line, ResponsiveContainer } from "recharts";
import MonthSelector from "@/components/MonthSelector";
import Auth from "@/components/Auth";

const COLORS = ['#f97316', '#1e40af', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#65a30d'];

const Analise = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Dados do mês atual
  const { data: monthlyData = [] } = useQuery({
    queryKey: ['monthly-analysis', selectedMonth.getMonth(), selectedMonth.getFullYear()],
    queryFn: async () => {
      if (!user) return [];
      
      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Dados dos últimos 6 meses para tendência
  const { data: trendData = [] } = useQuery({
    queryKey: ['trend-analysis', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      
      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .gte('date', sixMonthsAgo.toISOString().split('T')[0])
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  // Processamento dos dados
  const processMonthlyData = () => {
    const revenue = monthlyData.filter(item => item.type === 'entrada').reduce((sum, item) => sum + item.amount, 0);
    const expenses = monthlyData.filter(item => item.type === 'saida').reduce((sum, item) => sum + item.amount, 0);
    const profit = revenue - expenses;
    
    return { revenue, expenses, profit };
  };

  const processCategoryData = () => {
    const categoryTotals = monthlyData
      .filter(item => item.type === 'saida')
      .reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const processTrendData = () => {
    const monthlyTotals = trendData.reduce((acc, item) => {
      const monthKey = new Date(item.date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, receitas: 0, despesas: 0, lucro: 0 };
      }
      
      if (item.type === 'entrada') {
        acc[monthKey].receitas += item.amount;
      } else if (item.type === 'saida') {
        acc[monthKey].despesas += item.amount;
      }
      
      acc[monthKey].lucro = acc[monthKey].receitas - acc[monthKey].despesas;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(monthlyTotals);
  };

  const processBankData = () => {
    const bankTotals = monthlyData.reduce((acc, item) => {
      if (!acc[item.bank]) {
        acc[item.bank] = { receitas: 0, despesas: 0 };
      }
      
      if (item.type === 'entrada') {
        acc[item.bank].receitas += item.amount;
      } else if (item.type === 'saida') {
        acc[item.bank].despesas += item.amount;
      }
      
      return acc;
    }, {} as Record<string, any>);

    return Object.entries(bankTotals).map(([banco, data]) => ({
      banco,
      saldo: (data as any).receitas - (data as any).despesas,
      receitas: (data as any).receitas,
      despesas: (data as any).despesas
    }));
  };

  const monthlyStats = processMonthlyData();
  const categoryData = processCategoryData();
  const trendChartData = processTrendData();
  const bankData = processBankData();

  const chartConfig = {
    receitas: { label: "Receitas", color: "#16a34a" },
    despesas: { label: "Despesas", color: "#dc2626" },
    lucro: { label: "Lucro", color: "#f97316" }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800">Análise Financeira</h1>
          <p className="text-navy-600 mt-1">Relatórios visuais e tendências dos seus dados</p>
        </div>
      </div>

      <MonthSelector 
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {monthlyStats.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {monthlyStats.expenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <DollarSign className={`h-4 w-4 ${monthlyStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${monthlyStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {monthlyStats.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tendencia" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tendencia">Tendência</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="bancos">Por Banco</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
        </TabsList>

        <TabsContent value="tendencia">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                Tendência dos Últimos 6 Meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="receitas" stroke="#16a34a" strokeWidth={2} />
                  <Line type="monotone" dataKey="despesas" stroke="#dc2626" strokeWidth={2} />
                  <Line type="monotone" dataKey="lucro" stroke="#f97316" strokeWidth={2} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-orange-500" />
                Despesas por Categoria - {selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <RechartsPieChart data={categoryData} cx="50%" cy="50%" outerRadius={120} fill="#8884d8" dataKey="value">
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </RechartsPieChart>
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {categoryData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-sm">{item.name}: {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bancos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-500" />
                Movimentação por Banco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <BarChart data={bankData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="banco" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="receitas" fill="#16a34a" />
                  <Bar dataKey="despesas" fill="#dc2626" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dre">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                DRE - {selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <div className="flex justify-between text-lg font-semibold text-green-600">
                    <span>RECEITAS TOTAIS</span>
                    <span>{monthlyStats.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                </div>
                
                <div className="border-b pb-2">
                  <div className="flex justify-between text-lg font-semibold text-red-600">
                    <span>DESPESAS TOTAIS</span>
                    <span>{monthlyStats.expenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="ml-4 space-y-1 mt-2">
                    {categoryData.map((category) => (
                      <div key={category.name} className="flex justify-between text-sm text-gray-600">
                        <span>• {category.name}</span>
                        <span>{category.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-2">
                  <div className={`flex justify-between text-xl font-bold ${monthlyStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <span>RESULTADO LÍQUIDO</span>
                    <span>{monthlyStats.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Indicadores:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>Margem de Lucro: {monthlyStats.revenue > 0 ? ((monthlyStats.profit / monthlyStats.revenue) * 100).toFixed(1) : 0}%</div>
                    <div>Total de Lançamentos: {monthlyData.length}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analise;
