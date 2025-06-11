
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecurringBill {
  id: string;
  name: string;
  value: number;
  due_date: number;
  category: string;
  bank: string;
  recurring: boolean;
  paid_this_month: boolean;
  current_value: number;
}

interface DownloadContasButtonProps {
  bills: RecurringBill[];
  selectedMonth: Date;
}

const DownloadContasButton = ({ bills, selectedMonth }: DownloadContasButtonProps) => {
  const { toast } = useToast();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const generateCSV = () => {
    if (bills.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há contas para exportar",
        variant: "destructive",
      });
      return;
    }

    // Cabeçalho do CSV
    const headers = [
      'Nome da Conta',
      'Dia de Vencimento',
      'Categoria',
      'Banco',
      'Valor Original',
      'Valor Atual',
      'Status Pagamento',
      'Recorrente'
    ];

    // Converter dados para CSV
    const csvData = bills.map(bill => [
      `"${bill.name}"`,
      bill.due_date.toString(),
      bill.category,
      bill.bank,
      formatCurrency(bill.value),
      formatCurrency(bill.current_value || bill.value),
      bill.paid_this_month ? 'Pago' : 'Pendente',
      bill.recurring ? 'Sim' : 'Não'
    ]);

    // Juntar cabeçalho e dados
    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    // Gerar nome do arquivo baseado no mês
    const monthYear = `${String(selectedMonth.getMonth() + 1).padStart(2, '0')}_${selectedMonth.getFullYear()}`;
    const fileName = `contas_${monthYear}.csv`;

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

export default DownloadContasButton;
