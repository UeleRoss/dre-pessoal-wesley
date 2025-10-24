import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2, Repeat, Calendar, CreditCard, AlertTriangle } from "lucide-react";
import { formatBrazilDate } from "@/utils/dateUtils";
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

  const getRowBgColor = () => {
    if (item.needs_review) return 'bg-yellow-50/70 border-yellow-200';
    if (isIncomeSummary) return 'bg-green-50/70 border-green-200';
    if (isExpenseSummary) return 'bg-blue-50/70 border-blue-200';
    return 'bg-white';
  };

  const amountFormatted = Number(item.amount).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });


  return (
    <div
      className={`p-2.5 border rounded-lg hover:shadow-sm transition-all ${getRowBgColor()}`}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
        {/* Coluna Esquerda: Checkbox, Data, Descrição, Categoria, Banco */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(item.id, checked as boolean)}
            className="flex-shrink-0"
          />
          <div className="md:flex-1 min-w-0">
            {/* Mobile: Valor e Descrição em cima */}
            <div className="md:hidden flex justify-between items-start mb-1.5">
              <span className="font-medium text-sm text-gray-900 leading-tight pr-2 break-words">
                {item.description}
              </span>
              <span
                className={`text-sm font-semibold text-right flex-shrink-0 ${
                  item.type === 'entrada' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {item.type === 'saida' && '-'}{amountFormatted}
              </span>
            </div>

            {/* Desktop: Descrição */}
            <div className="hidden md:block font-medium text-sm text-gray-900 truncate mb-0.5">
              {item.description}
            </div>

            {/* Meta: Data, Categoria, Banco */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
              <span className="truncate max-w-[100px] md:max-w-[120px]">{item.category}</span>
              <span className="text-gray-300">•</span>
              <span className="truncate max-w-[80px] md:max-w-[100px]">{item.bank}</span>
              {item.imported_from && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-yellow-600 truncate max-w-[80px] text-[10px]">
                    {item.imported_from}
                  </span>
                </>
              )}
              <span className="text-gray-300">•</span>
              <span className="font-medium">
                {formatBrazilDate(item.date).slice(0, 5)}
              </span>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Badges, Tipo, Valor (desktop), Ações */}
        <div className="flex items-center justify-between md:justify-end gap-2 md:gap-3 w-full md:w-auto">
          {/* Badges e Ações (Mobile) */}
          <div className="flex items-center gap-1 md:gap-1.5">
            {item.needs_review && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-yellow-100 text-yellow-800 border-yellow-400">
                <AlertTriangle className="h-3 w-3" />
              </Badge>
            )}
            {item.is_recurring && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-blue-50 text-blue-700 border-blue-300">
                <Repeat className="h-3 w-3" />
              </Badge>
            )}
            {item.is_installment && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-purple-50 text-purple-700 border-purple-300">
                <Calendar className="h-3 w-3 mr-0.5" />
                {item.installment_number}/{item.total_installments}
              </Badge>
            )}
            {item.credit_card && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-pink-50 text-pink-700 border-pink-300 max-w-[80px] truncate">
                <CreditCard className="h-3 w-3 mr-0.5 flex-shrink-0" />
                <span className="truncate">{item.credit_card}</span>
              </Badge>
            )}
          </div>

          {/* Ações (Mobile) e Grupo Direita (Desktop) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden md:flex items-center gap-2">
              <Badge
                variant={item.type === 'entrada' ? 'default' : 'destructive'}
                className="text-[10px] h-5 w-14 justify-center"
              >
                {item.type === 'entrada' ? 'Entrada' : 'Saída'}
              </Badge>
              <div
                className={`text-sm font-semibold min-w-[90px] text-right ${
                  item.type === 'entrada' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {item.type === 'entrada' ? '+' : '-'}{' '}{amountFormatted.replace('R$', '')}
              </div>
            </div>

            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(item)}
                disabled={isSummary}
                title={isSummary ? "Resumos não podem ser editados" : "Editar"}
                className="h-7 w-7 p-0 hover:bg-blue-100 hover:text-blue-700"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-100 hover:text-red-700 h-7 w-7 p-0"
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Excluir {isIncomeSummary ? 'Resumo de Receitas' : isExpenseSummary ? 'Resumo de Gastos' : 'Lançamento'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir este {isSummary ? 'resumo' : 'lançamento'}? Esta ação não pode ser desfeita.
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
      </div>
    </div>
  );
};

export default FinancialItemRow;
