import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FinancialItem } from "@/types/financial";
import { Check, X, Edit2, CreditCard } from "lucide-react";

interface RecurringExpenseItemProps {
  item: FinancialItem;
  onApprove: (amount: number) => void;
  onSkip: () => void;
}

const RecurringExpenseItem = ({ item, onApprove, onSkip }: RecurringExpenseItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAmount, setEditedAmount] = useState(String(item.amount));

  const handleApprove = () => {
    if (isEditing) {
      onApprove(parseFloat(editedAmount));
    } else {
      onApprove(item.amount);
    }
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedAmount(String(item.amount));
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-300 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{item.description}</span>
          {item.credit_card && (
            <Badge variant="outline" className="text-xs">
              <CreditCard className="h-3 w-3 mr-1" />
              {item.credit_card}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{item.category}</span>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">R$</span>
              <Input
                type="number"
                step="0.01"
                value={editedAmount}
                onChange={(e) => setEditedAmount(e.target.value)}
                className="w-24 h-7 text-sm"
                autoFocus
              />
            </div>
          ) : (
            <span className="text-sm font-semibold text-green-700">
              R$ {item.amount.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelEdit}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4 text-gray-500" />
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={handleApprove}
              className="h-8 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-1" />
              Confirmar
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEdit}
              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
              title="Editar valor"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={handleApprove}
              className="h-8 bg-green-600 hover:bg-green-700"
              title="Aprovar com este valor"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onSkip}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              title="Pular este mês"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default RecurringExpenseItem;
