
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2 } from "lucide-react";
import { formatBrazilDate, formatBrazilDateTime } from "@/utils/dateUtils";
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

interface FinancialItemRowProps {
  item: FinancialItem;
  isSelected: boolean;
  onSelect: (itemId: string, checked: boolean) => void;
  onEdit: (item: FinancialItem) => void;
  onDelete: (id: string) => void;
}

const FinancialItemRow = ({ item, isSelected, onSelect, onEdit, onDelete }: FinancialItemRowProps) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(item.id, checked as boolean)}
        />
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <Badge variant={item.type === 'entrada' ? 'default' : 'destructive'}>
              {item.type === 'entrada' ? 'Entrada' : 'Saída'}
            </Badge>
            <span className="font-medium">{item.description}</span>
          </div>
          
          <div className="text-sm text-gray-600 flex gap-4">
            <span>📅 {formatBrazilDate(item.date)}</span>
            <span>🏷️ {item.category}</span>
            <span>🏦 {item.bank}</span>
            {item.source && <span>📁 {item.source}</span>}
          </div>
          
          <div className="text-xs text-gray-400 mt-1">
            Criado em: {formatBrazilDateTime(item.created_at)}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className={`text-lg font-bold ${
            item.type === 'entrada' ? 'text-green-600' : 'text-red-600'
          }`}>
            {item.type === 'entrada' ? '+' : '-'} {Number(item.amount).toLocaleString('pt-BR', { 
              style: 'currency', 
              currency: 'BRL' 
            })}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(item)}
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
                <AlertDialogTitle>Excluir Lançamento</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => onDelete(item.id)}
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
};

export default FinancialItemRow;
