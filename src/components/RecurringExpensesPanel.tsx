import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRecurringExpenses } from "@/hooks/useRecurringExpenses";
import RecurringExpenseItem from "./RecurringExpenseItem";
import { AlertCircle, CreditCard, CheckCircle } from "lucide-react";
import { FinancialItem } from "@/types/financial";

interface RecurringExpensesPanelProps {
  user: any;
  currentMonth: string;
  onApprove: () => void;
}

const RecurringExpensesPanel = ({ user, currentMonth, onApprove }: RecurringExpensesPanelProps) => {
  const {
    pendingExpenses,
    isLoadingPending,
    approveExpense,
    skipExpense,
    isApproving,
    isSkipping
  } = useRecurringExpenses(user?.id || '', currentMonth);

  // Agrupar por cartão
  const groupedByCard = pendingExpenses.reduce((acc, item) => {
    const card = item.credit_card || 'Sem cartão';
    if (!acc[card]) acc[card] = [];
    acc[card].push(item);
    return acc;
  }, {} as Record<string, FinancialItem[]>);

  const handleApprove = async (id: string, amount: number) => {
    await approveExpense.mutateAsync({ id, amount });
    onApprove();
  };

  const handleSkip = async (id: string) => {
    await skipExpense.mutateAsync(id);
    onApprove();
  };

  if (isLoadingPending) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Carregando contas recorrentes...</AlertDescription>
      </Alert>
    );
  }

  if (pendingExpenses.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">
          Todas as contas recorrentes foram aprovadas ou não há contas pendentes para este mês.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertCircle className="h-5 w-5" />
          Contas Recorrentes - Aprovação Pendente
          <Badge variant="destructive" className="ml-2">
            {pendingExpenses.length}
          </Badge>
        </CardTitle>
        <p className="text-sm text-orange-600">
          Revise e aprove as contas recorrentes deste mês. Você pode ajustar os valores antes de aprovar.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(groupedByCard).map(([cardName, items]) => (
            <div key={cardName} className="space-y-2">
              {/* Cabeçalho do grupo */}
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <CreditCard className="h-4 w-4" />
                {cardName}
                <Badge variant="outline" className="ml-1">
                  {items.length} {items.length === 1 ? 'conta' : 'contas'}
                </Badge>
                <span className="text-xs text-gray-500 ml-auto">
                  Total: R$ {items.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                </span>
              </div>

              {/* Lista de itens */}
              {items.map((item) => (
                <RecurringExpenseItem
                  key={item.id}
                  item={item}
                  onApprove={(amount) => handleApprove(item.id, amount)}
                  onSkip={() => handleSkip(item.id)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Resumo total */}
        <div className="mt-4 pt-4 border-t border-orange-200">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700">Total Pendente:</span>
            <span className="text-lg font-bold text-orange-700">
              R$ {pendingExpenses.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecurringExpensesPanel;
