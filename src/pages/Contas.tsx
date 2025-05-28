
import { CreditCard, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const Contas = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-800">Contas Fixas</h1>
          <p className="text-navy-600 mt-1">Gerenciamento de contas recorrentes</p>
        </div>
        
        <Button className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="font-semibold text-navy-800 mb-2">Contas Cadastradas</h3>
            <p className="text-sm text-navy-600">Visualizar e editar contas fixas</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="font-semibold text-navy-800 mb-2">Vencimentos</h3>
            <p className="text-sm text-navy-600">Controlar status de pagamento</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-navy-800 mb-2">Gestão de Contas em Desenvolvimento</h3>
          <p className="text-navy-600 mb-6">
            Aqui você poderá cadastrar contas fixas, definir vencimentos e controlar pagamentos mensais.
          </p>
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar Primeira Conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Contas;
