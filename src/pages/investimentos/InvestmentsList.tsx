
import { PiggyBank } from "lucide-react";
import InvestmentCard from "./InvestmentCard";
import type { Investment, InvestmentTransaction } from "./types";

interface InvestmentsListProps {
  investments: Investment[];
  transactions: InvestmentTransaction[];
  onAporte: (investment: Investment) => void;
  onRetirada: (investment: Investment) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

const InvestmentsList = ({ 
  investments, 
  transactions, 
  onAporte, 
  onRetirada, 
  onDelete, 
  isDeleting 
}: InvestmentsListProps) => {
  if (investments.length === 0) {
    return (
      <div className="col-span-full text-center py-8 text-gray-500">
        <PiggyBank className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium">Nenhum investimento cadastrado</p>
        <p className="text-sm">Comece adicionando seus primeiros investimentos</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {investments.map((investment) => (
        <InvestmentCard
          key={investment.id}
          investment={investment}
          transactions={transactions}
          onAporte={onAporte}
          onRetirada={onRetirada}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  );
};

export default InvestmentsList;
