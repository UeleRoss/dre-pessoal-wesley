
import { Plus, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const Lancamentos = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800">Lançamentos</h1>
          <p className="text-navy-600 mt-1">Todos os registros financeiros</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            Novo Lançamento
          </Button>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center py-12">
          <div className="mb-4">
            <div className="w-16 h-16 bg-navy-100 rounded-full flex items-center justify-center mx-auto">
              <Plus className="h-8 w-8 text-navy-600" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-navy-800 mb-2">Página em Desenvolvimento</h3>
          <p className="text-navy-600 mb-6">
            Aqui será exibida a tabela completa de lançamentos com filtros por data, tipo, valor, banco e categoria.
          </p>
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Lançamento
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Lancamentos;
