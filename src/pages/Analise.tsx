
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, PieChart, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, Tooltip, LabelList } from "recharts";
import MonthSelector from "@/components/MonthSelector";
import PeriodSelector from "@/components/PeriodSelector";
import Auth from "@/components/Auth";
import { summaryToItem, incomeSummaryToItem } from "@/utils/financialDataTransforms";
import { PeriodType } from "@/components/PeriodSelector";

const COLORS = ['#f97316', '#1e40af', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#65a30d'];

interface FinancialItem {
  id: string;
  created_at: string;
  date: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  bank: string;
  source: string | null;
  user_id: string;
}

interface FinancialSummary {
  id: string;
  created_at: string;
  month: string;
  category: string;
  total_value: number;
  user_id: string;
}

interface IncomeSummary {
  id: string;
  created_at: string;
  month: string;
  source: string;
  total_value: number;
  user_id: string;
}

const Analise = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [periodType, setPeriodType] = useState<PeriodType>('month');
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

  // Dados do período atual - incluindo resumos mensais
  const { data: periodData = [], refetch: refetchPeriod } = useQuery({
    queryKey: ['period-analysis', periodType, selectedMonth.getMonth(), selectedMonth.getFullYear(), user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      let startDate: string;
      let endDate: string;
      
      if (periodType === 'year') {
        startDate = new Date(selectedMonth.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = new Date(selectedMonth.getFullYear(), 11, 31).toISOString().split('T')[0];
      } else {
        startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).toISOString().split('T')[0];
      }
      
      // Buscar lançamentos detalhados
      const { data: items, error } = await supabase
        .from('financial_items')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Buscar resumos de gastos do período
      let summariesQuery;
      if (periodType === 'year') {
        summariesQuery = supabase
          .from('financial_summary')
          .select('*')
          .gte('month', `${selectedMonth.getFullYear()}-01-01`)
          .lte('month', `${selectedMonth.getFullYear()}-12-01`)
          .eq('user_id', user.id);
      } else {
        const monthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-01`;
        summariesQuery = supabase
          .from('financial_summary')
          .select('*')
          .eq('month', monthStr)
          .eq('user_id', user.id);
      }
      
      const { data: summaries, error: summariesError } = await summariesQuery;
      if (summariesError) throw summariesError;
      
      // Buscar resumos de receitas do período
      let incomeSummariesQuery;
      if (periodType === 'year') {
        incomeSummariesQuery = supabase
          .from('financial_summary_income')
          .select('*')
          .gte('month', `${selectedMonth.getFullYear()}-01-01`)
          .lte('month', `${selectedMonth.getFullYear()}-12-01`)
          .eq('user_id', user.id);
      } else {
        const monthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-01`;
        incomeSummariesQuery = supabase
          .from('financial_summary_income')
          .select('*')
          .eq('month', monthStr)
          .eq('user_id', user.id);
      }
      
      const { data: incomeSummaries, error: incomeSummariesError } = await incomeSummariesQuery;
      if (incomeSummariesError) throw incomeSummariesError;
      
      // Converter resumos para formato de item e combinar
      const summaryItems = summaries?.map(summaryToItem) || [];
      const incomeSummaryItems = incomeSummaries?.map(incomeSummaryToItem) || [];
      const combined = [...(items || []), ...summaryItems, ...incomeSummaryItems];
      
      console.log(`Dados do período: ${items?.length || 0} lançamentos + ${summaries?.length || 0} gastos + ${incomeSummaries?.length || 0} receitas = ${combined.length} total`);
      
      return combined;
    },
    enabled: !!user,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  // Dados históricos completos para tendência - desde o primeiro registro
  const { data: trendData = [], refetch: refetchTrend } = useQuery({
    queryKey: ['trend-analysis', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Buscar TODOS os lançamentos detalhados do usuário
      const { data: items, error } = await supabase
        .from('financial_items')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      // Buscar TODOS os resumos mensais do usuário
      const { data: summaries, error: summariesError } = await supabase
        .from('financial_summary')
        .select('*')
        .eq('user_id', user.id)
        .order('month', { ascending: true });
      
      if (summariesError) throw summariesError;
      
      // Buscar TODOS os resumos de receitas
      const { data: incomeSummaries, error: incomeSummariesError } = await supabase
        .from('financial_summary_income')
        .select('*')
        .eq('user_id', user.id)
        .order('month', { ascending: true });
      
      if (incomeSummariesError) throw incomeSummariesError;
      
      // Converter resumos para formato de item e combinar
      const summaryItems = summaries?.map(summaryToItem) || [];
      const incomeSummaryItems = incomeSummaries?.map(incomeSummaryToItem) || [];
      const combined = [...(items || []), ...summaryItems, ...incomeSummaryItems];
      
      console.log(`Dados históricos completos: ${items?.length || 0} lançamentos + ${summaries?.length || 0} gastos + ${incomeSummaries?.length || 0} receitas = ${combined.length} total`);
      
      return combined;
    },
    enabled: !!user,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  // Escutar mudanças em tempo real
  useEffect(() => {
    if (user) {
      const channel = supabase
        .channel('financial-analysis-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'financial_items',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            refetchPeriod();
            refetchTrend();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'financial_summary',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            refetchPeriod();
            refetchTrend();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'financial_summary_income',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            refetchPeriod();
            refetchTrend();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, refetchPeriod, refetchTrend]);

  if (!user) {
    return <Auth onAuthChange={setUser} />;
  }

  // Processamento dos dados do período atual
  const processPeriodData = () => {
    const revenue = periodData
      .filter(item => item.type === 'entrada')
      .reduce((sum, item) => sum + Number(item.amount), 0);
    
    const expenses = periodData
      .filter(item => item.type === 'saida')
      .reduce((sum, item) => sum + Number(item.amount), 0);
    
    const profit = revenue - expenses;
    
    return { revenue, expenses, profit };
  };

  // Processamento dados por categoria (apenas saídas)
  const processCategoryData = () => {
    const expensesByCategory = periodData
      .filter(item => item.type === 'saida')
      .reduce((acc, item) => {
        const category = item.category || 'Sem categoria';
        acc[category] = (acc[category] || 0) + Number(item.amount);
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  // Processamento dados de tendência - todos os meses históricos
  const processTrendData = () => {
    if (trendData.length === 0) return [];

    // Encontrar o primeiro e último mês com dados
    const firstDate = new Date(Math.min(...trendData.map(item => new Date(item.date).getTime())));
    const lastDate = new Date();

    // Criar array com todos os meses do período
    const allMonths: Record<string, any> = {};
    const current = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    
    while (current <= lastDate) {
      const monthKey = current.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      allMonths[monthKey] = { 
        month: monthKey, 
        receitas: 0, 
        despesas: 0, 
        lucro: 0,
        date: new Date(current)
      };
      current.setMonth(current.getMonth() + 1);
    }

    // Processar dados existentes
    trendData.forEach(item => {
      const date = new Date(item.date);
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      if (allMonths[monthKey]) {
        const amount = Number(item.amount);
        if (item.type === 'entrada') {
          allMonths[monthKey].receitas += amount;
        } else if (item.type === 'saida') {
          allMonths[monthKey].despesas += amount;
        }
        
        allMonths[monthKey].lucro = allMonths[monthKey].receitas - allMonths[monthKey].despesas;
      }
    });

    // Converter para array e ordenar por data
    return Object.values(allMonths)
      .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
      .map(({ date, ...rest }) => rest); // Remover a propriedade date do resultado final
  };

  // Processamento dados por banco
  const processBankData = () => {
    const bankTotals = periodData.reduce((acc, item) => {
      const bank = item.bank || 'Sem banco';
      
      if (!acc[bank]) {
        acc[bank] = { receitas: 0, despesas: 0 };
      }
      
      const amount = Number(item.amount);
      if (item.type === 'entrada') {
        acc[bank].receitas += amount;
      } else if (item.type === 'saida') {
        acc[bank].despesas += amount;
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

  // Processamento DRE detalhado
  const processDREData = () => {
    const revenueBySource = periodData
      .filter(item => item.type === 'entrada')
      .reduce((acc, item) => {
        const source = item.category || 'Outras receitas';
        acc[source] = (acc[source] || 0) + Number(item.amount);
        return acc;
      }, {} as Record<string, number>);

    const expensesByCategory = periodData
      .filter(item => item.type === 'saida')
      .reduce((acc, item) => {
        const category = item.category || 'Outras despesas';
        acc[category] = (acc[category] || 0) + Number(item.amount);
        return acc;
      }, {} as Record<string, number>);

    return {
      revenues: Object.entries(revenueBySource).map(([source, value]) => ({ source, value })),
      expenses: Object.entries(expensesByCategory).map(([category, value]) => ({ category, value }))
    };
  };

  const periodStats = processPeriodData();
  const categoryData = processCategoryData();
  const trendChartData = processTrendData();
  const bankData = processBankData();
  const dreData = processDREData();

  const chartConfig = {
    receitas: { label: "Receitas", color: "#16a34a" },
    despesas: { label: "Despesas", color: "#dc2626" },
    lucro: { label: "Lucro", color: "#f97316" }
  };

  const categoryChartConfig = categoryData.reduce((config, item, index) => {
    config[item.name] = {
      label: item.name,
      color: COLORS[index % COLORS.length]
    };
    return config;
  }, {} as any);

  // Custom tooltip para mostrar valores no gráfico
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Label customizado para mostrar valores nos pontos
  const CustomizedLabel = (props: any) => {
    const { x, y, value } = props;
    return (
      <text x={x} y={y - 10} fill="#666" textAnchor="middle" fontSize="10">
        {value > 0 ? `${(value / 1000).toFixed(0)}k` : ''}
      </text>
    );
  };

  const getPeriodTitle = () => {
    if (periodType === 'year') {
      return selectedMonth.getFullYear().toString();
    }
    return selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800">Análise Financeira</h1>
          <p className="text-navy-600 mt-1">Relatórios visuais sincronizados em tempo real</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <MonthSelector 
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />
        <PeriodSelector 
          selectedPeriod={periodType}
          onPeriodChange={setPeriodType}
        />
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Receitas {periodType === 'year' ? 'do Ano' : 'do Mês'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {periodStats.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {periodData.filter(item => item.type === 'entrada').length} lançamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Despesas {periodType === 'year' ? 'do Ano' : 'do Mês'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {periodStats.expenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {periodData.filter(item => item.type === 'saida').length} lançamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <DollarSign className={`h-4 w-4 ${periodStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${periodStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {periodStats.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Margem: {periodStats.revenue > 0 ? ((periodStats.profit / periodStats.revenue) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs component with all the charts */}
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
                Tendência Histórica Completa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trendChartData.length > 0 ? (
                <div className="w-full h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="receitas" 
                        stroke="#16a34a" 
                        strokeWidth={3}
                        dot={{ fill: '#16a34a', strokeWidth: 2, r: 6 }}
                      >
                        <LabelList content={<CustomizedLabel />} />
                      </Line>
                      <Line 
                        type="monotone" 
                        dataKey="despesas" 
                        stroke="#dc2626" 
                        strokeWidth={3}
                        dot={{ fill: '#dc2626', strokeWidth: 2, r: 6 }}
                      >
                        <LabelList content={<CustomizedLabel />} />
                      </Line>
                      <Line 
                        type="monotone" 
                        dataKey="lucro" 
                        stroke="#f97316" 
                        strokeWidth={3}
                        dot={{ fill: '#f97316', strokeWidth: 2, r: 6 }}
                      >
                        <LabelList content={<CustomizedLabel />} />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[500px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p className="text-lg font-medium">Sem dados suficientes</p>
                    <p className="text-sm">Adicione lançamentos para visualizar a tendência</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-orange-500" />
                Despesas por Categoria - {getPeriodTitle()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <div className="space-y-6">
                  <div className="w-full h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Tooltip 
                          formatter={(value: number) => [
                            value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                            'Valor'
                          ]}
                        />
                        <Pie 
                          data={categoryData} 
                          cx="50%" 
                          cy="50%" 
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                          outerRadius={120} 
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <span className="font-bold text-red-600">
                          {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p className="text-lg font-medium">Nenhuma despesa encontrada</p>
                    <p className="text-sm">Adicione lançamentos de saída para este período</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bancos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-500" />
                Movimentação por Banco - {getPeriodTitle()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bankData.length > 0 ? (
                <div className="space-y-6">
                  <div className="w-full h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bankData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="banco" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={12}
                        />
                        <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                            name === 'receitas' ? 'Receitas' : name === 'despesas' ? 'Despesas' : 'Saldo'
                          ]}
                        />
                        <Bar dataKey="receitas" fill="#16a34a" name="receitas" />
                        <Bar dataKey="despesas" fill="#dc2626" name="despesas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {bankData.map((bank, index) => (
                      <div key={bank.banco} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-lg">{bank.banco}</h4>
                          <span className={`font-bold text-lg ${bank.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Saldo: {bank.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span>Receitas:</span>
                            <span className="font-medium text-green-600">
                              {bank.receitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Despesas:</span>
                            <span className="font-medium text-red-600">
                              {bank.despesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p className="text-lg font-medium">Sem movimentações</p>
                    <p className="text-sm">Adicione lançamentos para visualizar por banco</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dre">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                DRE - Demonstrativo de Resultado - {getPeriodTitle()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Receitas */}
                <div className="border-b pb-4">
                  <div className="flex justify-between text-xl font-bold text-green-600 mb-4">
                    <span>RECEITAS TOTAIS</span>
                    <span>{periodStats.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  {dreData.revenues.length > 0 && (
                    <div className="ml-4 space-y-2">
                      {dreData.revenues.map((revenue) => (
                        <div key={revenue.source} className="flex justify-between text-sm">
                          <span className="text-gray-700">• {revenue.source}</span>
                          <span className="font-medium text-green-600">
                            {revenue.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Despesas */}
                <div className="border-b pb-4">
                  <div className="flex justify-between text-xl font-bold text-red-600 mb-4">
                    <span>DESPESAS TOTAIS</span>
                    <span>{periodStats.expenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  {dreData.expenses.length > 0 && (
                    <div className="ml-4 space-y-2">
                      {dreData.expenses.map((expense) => (
                        <div key={expense.category} className="flex justify-between text-sm">
                          <span className="text-gray-700">• {expense.category}</span>
                          <span className="font-medium text-red-600">
                            {expense.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Resultado */}
                <div className="pt-4">
                  <div className={`flex justify-between text-2xl font-bold ${periodStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <span>RESULTADO LÍQUIDO</span>
                    <span>{periodStats.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                </div>

                {/* Indicadores */}
                <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                  <h4 className="font-bold text-lg mb-4">Indicadores Financeiros:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {periodStats.revenue > 0 ? ((periodStats.profit / periodStats.revenue) * 100).toFixed(1) : 0}%
                      </div>
                      <div className="text-sm text-gray-600">Margem de Lucro</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{periodData.length}</div>
                      <div className="text-sm text-gray-600">Total de Lançamentos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {periodData.filter(item => item.type === 'entrada').length}
                      </div>
                      <div className="text-sm text-gray-600">Lançamentos de Entrada</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {periodData.filter(item => item.type === 'saida').length}
                      </div>
                      <div className="text-sm text-gray-600">Lançamentos de Saída</div>
                    </div>
                  </div>
                </div>

                {/* Análise Comparativa */}
                {periodType === 'year' && (
                  <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                    <h4 className="font-bold text-lg mb-4">Análise Anual:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">
                          {(periodStats.revenue / 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div className="text-sm text-gray-600">Receita Média Mensal</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-red-600">
                          {(periodStats.expenses / 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div className="text-sm text-gray-600">Despesa Média Mensal</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-xl font-bold ${periodStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(periodStats.profit / 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        <div className="text-sm text-gray-600">Lucro Médio Mensal</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analise;
