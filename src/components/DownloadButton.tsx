
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { FinancialItem } from "@/types/financial";
import { useToast } from "@/hooks/use-toast";

interface DownloadButtonProps {
  financialItems: FinancialItem[];
  selectedMonth: Date;
  periodType: string;
}

const DownloadButton = ({ financialItems, selectedMonth, periodType }: DownloadButtonProps) => {
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

  const generateCSV = () => {
    if (financialItems.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há dados para exportar no período selecionado",
        variant: "destructive",
      });
      return;
    }

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
    const csvData = financialItems.map(item => [
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

    // Gerar nome do arquivo baseado no período
    let fileName = '';
    if (periodType === 'all') {
      fileName = 'lancamentos_todos_os_dados.csv';
    } else if (periodType === 'year') {
      fileName = `lancamentos_${selectedMonth.getFullYear()}.csv`;
    } else {
      const monthYear = `${String(selectedMonth.getMonth() + 1).padStart(2, '0')}_${selectedMonth.getFullYear()}`;
      fileName = `lancamentos_${monthYear}.csv`;
    }

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
      description: `Arquivo ${fileName} baixado com sucesso!`,
    });
  };

  return (
    <Button 
      variant="outline" 
      onClick={generateCSV}
      className="flex-1 sm:flex-none"
    >
      <Download className="h-4 w-4 mr-2" />
      Baixar CSV
    </Button>
  );
};

export default DownloadButton;
