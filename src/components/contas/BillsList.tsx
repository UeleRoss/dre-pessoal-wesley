
import { CheckCircle, XCircle, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

interface RecurringBill {
  id: string;
  name: string;
  value: number;
  due_date: number;
  category: string;
  bank: string;
  recurring: boolean;
  paid_this_month: boolean;
}

interface BillAdjustment {
  id: string;
  bill_id: string;
  month: string;
  adjusted_value: number;
  user_id: string;
}

interface BillsListProps {
  bills: RecurringBill[];
  billAdjustments: BillAdjustment[];
  onTogglePaid: (billId: string, paid: boolean) => void;
  onEdit: (bill: RecurringBill) => void;
  onDelete: (billId: string) => void;
  onAdjustValue: (billId: string, currentValue: number) => void;
}

const BillsList = ({ 
  bills, 
  billAdjustments, 
  onTogglePaid, 
  onEdit, 
  onDelete, 
  onAdjustValue 
}: BillsListProps) => {
  const getCurrentBillValue = (bill: RecurringBill) => {
    const adjustment = billAdjustments.find(adj => adj.bill_id === bill.id);
    return adjustment ? adjustment.adjusted_value : bill.value;
  };

  if (bills.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contas do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg font-medium">Nenhuma conta cadastrada</p>
            <p className="text-sm">Adicione suas contas recorrentes para gerenciar melhor suas finanças</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contas do Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {bills.map((bill) => {
            const currentValue = getCurrentBillValue(bill);
            const hasAdjustment = billAdjustments.some(adj => adj.bill_id === bill.id);
            
            return (
              <div key={bill.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={bill.paid_this_month}
                      onCheckedChange={(checked) => onTogglePaid(bill.id, checked as boolean)}
                      className="h-5 w-5"
                    />
                    <span className="text-sm text-gray-600">Paga</span>
                  </div>
                  
                  <div>
                    <h3 className={`font-medium ${bill.paid_this_month ? 'line-through text-gray-500' : ''}`}>
                      {bill.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Vencimento: dia {bill.due_date} • {bill.category} • {bill.bank}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <p className={`font-bold ${bill.paid_this_month ? 'text-gray-500' : 'text-red-600'}`}>
                        {currentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      {hasAdjustment && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Ajustado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {bill.recurring ? 'Recorrente' : 'Único'}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAdjustValue(bill.id, bill.value)}
                      title="Ajustar valor deste mês"
                    >
                      <Edit className="h-4 w-4 text-blue-600" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(bill)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Conta</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a conta "{bill.name}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onDelete(bill.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default BillsList;
