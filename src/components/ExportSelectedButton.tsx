
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { FinancialItem } from "@/types/financial";
import { useToast } from "@/hooks/use-toast";

interface ExportSelectedButtonProps {
  selectedItems: string[];
  allItems: FinancialItem[];
  disabled?: boolean;
}

const ExportSelectedButton = ({ selectedItems, allItems, disabled }: ExportSelectedButtonProps) => {
  const { toast } = useToast();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const exportSelectedToCSV = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhum item selecionado para exportar",
        variant: "destructive",
      });
      return;
    }

    // Filtrar apenas os itens selecionados
    const selectedFinancialItems = allItems.filter(item => selectedItems.includes(item.id));

    // Cabeçalho do CSV
    const headers = [
      'Data',
      'Tipo',
      'Descrição',
      'Categoria',
      'Banco',
      'Valor',
      'Origem'
    ];

    // Converter dados para CSV
    const csvData = selectedFinancialItems.map(item => [
      formatDate(item.date),
      item.type === 'entrada' ? 'Entrada' : 'Saída',
      `"${item.description}"`, // Aspas para evitar problemas com vírgulas na descrição
      item.category,
      item.bank,
      formatCurrency(item.amount),
      item.source === 'financial_summary' ? 'Resumo Mensal' : 
      item.source === 'financial_summary_income' ? 'Resumo de Receitas' : 'Lançamento Manual'
    ]);

    // Juntar cabeçalho e dados
    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    // Gerar nome do arquivo
    const now = new Date();
    const timestamp = `${String(now.getMonth() + 1).padStart(2, '0')}_${now.getFullYear()}`;
    const fileName = `lancamentos_selecionados_${timestamp}.csv`;

    // Criar e baixar arquivo
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Sucesso",
      description: `${selectedItems.length} lançamentos exportados para ${fileName}!`,
    });
  };

  return (
    <Button 
      variant="outline" 
      onClick={exportSelectedToCSV}
      disabled={disabled || selectedItems.length === 0}
      className="flex-1 sm:flex-none"
    >
      <Download className="h-4 w-4 mr-2" />
      Exportar Selecionados ({selectedItems.length})
    </Button>
  );
};

export default ExportSelectedButton;
