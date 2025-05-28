
import { BarChart3, TrendingUp, PieChart } from "lucide-react";

const Analise = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-navy-800">Análise Financeira</h1>
        <p className="text-navy-600 mt-1">Relatórios visuais e tendências</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="font-semibold text-navy-800 mb-2">Tendência Mensal</h3>
            <p className="text-sm text-navy-600">Gráfico de receitas, despesas e lucro</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center py-8">
            <PieChart className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="font-semibold text-navy-800 mb-2">Por Categoria</h3>
            <p className="text-sm text-navy-600">Distribuição de gastos</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="font-semibold text-navy-800 mb-2">DRE Mensal</h3>
            <p className="text-sm text-navy-600">Demonstrativo de resultados</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-navy-800 mb-2">Análises em Desenvolvimento</h3>
          <p className="text-navy-600">
            Esta seção conterá gráficos interativos, comparativos mensais e o DRE completo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Analise;
