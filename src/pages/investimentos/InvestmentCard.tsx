
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, TrendingUp, TrendingDown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Investment, InvestmentTransaction } from "./types";

interface InvestmentCardProps {
  investment: Investment;
  transactions: InvestmentTransaction[];
  onAporte: (investment: Investment) => void;
  onRetirada: (investment: Investment) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

const InvestmentCard = ({ 
  investment, 
  transactions, 
  onAporte, 
  onRetirada, 
  onDelete, 
  isDeleting 
}: InvestmentCardProps) => {
  const investmentTransactions = transactions.filter(t => t.investment_id === investment.id);
  const returns = investment.current_balance - investment.initial_amount;
  const returnPercent = investment.initial_amount > 0 ? ((returns / investment.initial_amount) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{investment.name}</CardTitle>
            <p className="text-sm text-gray-600">{investment.category}</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-red-600">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Investimento</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir "{investment.name}"? Isso também excluirá todo o histórico de transações. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => onDelete(investment.id)}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-2xl font-bold text-navy-800">
              {investment.current_balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-sm text-gray-600">
              Inicial: {investment.initial_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          
          <div className={`flex items-center gap-1 text-sm ${returns >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {returns >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>
              {returns.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({returnPercent.toFixed(2)}%)
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="flex-1"
              onClick={() => onAporte(investment)}
            >
              Aporte
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => onRetirada(investment)}
            >
              Retirada
            </Button>
          </div>
          
          <div className="text-xs text-gray-500">
            {investmentTransactions.length} transações
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvestmentCard;
