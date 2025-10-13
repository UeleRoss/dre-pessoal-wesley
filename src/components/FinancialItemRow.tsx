
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2 } from "lucide-react";
import { formatBrazilDate, formatBrazilDateTime } from "@/utils/dateUtils";
import { FinancialItem } from "@/types/financial";
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

interface FinancialItemRowProps {
  item: FinancialItem;
  isSelected: boolean;
  onSelect: (itemId: string, checked: boolean) => void;
  onEdit: (item: FinancialItem) => void;
  onDelete: (id: string) => void;
}

const FinancialItemRow = ({ item, isSelected, onSelect, onEdit, onDelete }: FinancialItemRowProps) => {
  const isExpenseSummary = item.source === 'financial_summary';
  const isIncomeSummary = item.source === 'financial_summary_income';
  const isSummary = isExpenseSummary || isIncomeSummary;
  
  // Log para debug
  if (isIncomeSummary) {
    console.log("💰 Renderizando receita:", item);
  }
  
  const getBadgeColor = () => {
    if (isIncomeSummary) return 'bg-green-100 text-green-800 border-green-200';
    if (isExpenseSummary) return 'bg-blue-100 text-blue-800 border-blue-200';
    return '';
  };
  
  const getRowBgColor = () => {
    if (isIncomeSummary) return 'bg-green-50 border-green-200';
    if (isExpenseSummary) return 'bg-blue-50 border-blue-200';
    return '';
  };
  
  return (
    <div className={`flex flex-col md:flex-row md:items-center md:justify-between p-3 md:p-4 border rounded-lg hover:bg-gray-50 ${getRowBgColor()} gap-3`}>
      <div className="flex items-start md:items-center gap-2 md:gap-3 flex-1">
        <div className="mt-1 md:mt-0">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(item.id, checked as boolean)}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant={item.type === 'entrada' ? 'default' : 'destructive'} className="text-xs">
              {item.type === 'entrada' ? 'Entrada' : 'Saída'}
            </Badge>
            {isIncomeSummary && (
              <Badge variant="outline" className={`${getBadgeColor()} text-xs`}>
                Resumo de Receitas
              </Badge>
            )}
            {isExpenseSummary && (
              <Badge variant="outline" className={`${getBadgeColor()} text-xs`}>
                Resumo de Gastos
              </Badge>
            )}
          </div>

          <div className="font-medium text-sm md:text-base mb-2 break-words">{item.description}</div>

          <div className="text-xs md:text-sm text-gray-600 flex flex-col md:flex-row md:flex-wrap gap-1 md:gap-4">
            <span>📅 {isSummary ? `${formatBrazilDate(item.date)} (mês todo)` : formatBrazilDate(item.date)}</span>
            <span>🏷️ {item.category}</span>
            <span>🏦 {item.bank}</span>
            {item.source && !isSummary && <span>📁 {item.source}</span>}
          </div>

          <div className="text-xs text-gray-400 mt-1">
            {isSummary ? 'Dados históricos agregados' : `Criado em: ${formatBrazilDateTime(item.created_at)}`}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-3 md:gap-4 border-t md:border-t-0 pt-3 md:pt-0">
        <div className="text-left md:text-right">
          <div className={`text-base md:text-lg font-bold ${
            item.type === 'entrada' ? 'text-green-600' : 'text-red-600'
          }`}>
            {item.type === 'entrada' ? '+' : '-'} {Number(item.amount).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })}
          </div>
        </div>

        <div className="flex gap-1 md:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(item)}
            disabled={isSummary}
            title={isSummary ? "Resumos não podem ser editados" : "Editar lançamento"}
            className="h-8 w-8 md:h-9 md:w-9 p-0"
          >
            <Edit className="h-3 w-3 md:h-4 md:w-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-red-600 h-8 w-8 md:h-9 md:w-9 p-0">
                <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[90vw] md:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base md:text-lg">
                  Excluir {isIncomeSummary ? 'Resumo de Receitas' : isExpenseSummary ? 'Resumo de Gastos' : 'Lançamento'}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  Tem certeza que deseja excluir este {isSummary ? 'resumo' : 'lançamento'}? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col md:flex-row gap-2">
                <AlertDialogCancel className="w-full md:w-auto">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(item.id)}
                  className="bg-red-600 hover:bg-red-700 w-full md:w-auto"
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
