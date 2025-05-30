
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { X, Upload, Download } from "lucide-react";

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CSVImportModal = ({ isOpen, onClose, onSuccess }: CSVImportModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo CSV válido.",
        variant: "destructive",
      });
    }
  };

  const detectSeparator = (text: string) => {
    const firstLine = text.split('\n')[0];
    // Conta quantas vírgulas e ponto e vírgulas existem na primeira linha
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    
    // Usa o separador que aparece mais vezes
    if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
    return semicolonCount > commaCount ? ';' : ',';
  };

  const parseCSV = (text: string) => {
    const separator = detectSeparator(text);
    console.log('Separador detectado:', separator);
    
    const lines = text.split('\n');
    
    // Como não há cabeçalho, processamos todas as linhas
    return lines.map(line => {
      if (line.trim() === '') return null;
      const values = line.split(separator).map(v => v.trim());
      
      // Mapeia as colunas por posição: Data, Descrição, Tipo, Categoria, Banco, Valor
      return {
        date: values[0] || '',
        description: values[1] || '',
        type: values[2] || '',
        category: values[3] || '',
        bank: values[4] || '',
        amount: values[5] || ''
      };
    }).filter(Boolean);
  };

  const parseDate = (dateStr: string): string => {
    console.log('Parsing date:', dateStr);
    
    // Se não há data, usa data atual
    if (!dateStr || dateStr.trim() === '') {
      const today = new Date().toISOString().split('T')[0];
      console.log('Data vazia, usando data atual:', today);
      return today;
    }

    // Remove espaços e caracteres especiais
    const cleanDate = dateStr.trim();
    
    // Verifica se já está no formato YYYY-MM-DD
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (isoDateRegex.test(cleanDate)) {
      // Valida se a data é válida
      const testDate = new Date(cleanDate);
      if (!isNaN(testDate.getTime())) {
        console.log('Data válida no formato ISO:', cleanDate);
        return cleanDate;
      }
    }

    // Tenta diferentes formatos de data
    const formats = [
      // DD/MM/YYYY ou DD/MM/YY
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
      // DD-MM-YYYY ou DD-MM-YY
      /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/,
      // MM/DD/YYYY ou MM/DD/YY (formato americano)
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/
    ];

    for (const format of formats) {
      const match = cleanDate.match(format);
      if (match) {
        let [, part1, part2, year] = match;
        
        // Ajusta o ano se for de 2 dígitos
        if (year.length === 2) {
          const yearNum = parseInt(year);
          year = yearNum > 50 ? `19${year}` : `20${year}`;
        }

        // Assume formato DD/MM/YYYY para datas brasileiras
        const day = part1.padStart(2, '0');
        const month = part2.padStart(2, '0');
        
        const formattedDate = `${year}-${month}-${day}`;
        
        // Valida a data
        const testDate = new Date(formattedDate);
        if (!isNaN(testDate.getTime())) {
          console.log('Data convertida de', cleanDate, 'para', formattedDate);
          return formattedDate;
        }
      }
    }

    // Se não conseguiu converter, usa data atual
    const fallbackDate = new Date().toISOString().split('T')[0];
    console.log('Não foi possível converter a data', cleanDate, ', usando data atual:', fallbackDate);
    return fallbackDate;
  };

  const handleImport = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const text = await file.text();
      const records = parseCSV(text);
      
      console.log('Registros processados:', records.length);
      console.log('Primeiro registro:', records[0]);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const record of records) {
        try {
          const validDate = parseDate(record.date);
          
          let type = (record.type || 'entrada').toLowerCase().trim();
          const description = record.description || 'Importado do CSV';
          
          // Limpa o valor removendo "R$", espaços e convertendo vírgula para ponto
          let amountStr = (record.amount || '0').toString();
          amountStr = amountStr.replace(/[R$\s]/g, '').replace(',', '.');
          const amount = parseFloat(amountStr);
          
          const category = record.category || 'Importado';
          const bank = record.bank || 'CONTA SIMPLES';
          
          // Normalizar o tipo para garantir que seja reconhecido corretamente
          if (type === 'saída' || type === 'saida' || type === 'out' || type === 'expense' || type === 'débito' || type === 'debito') {
            type = 'saida';
          } else if (type === 'entrada' || type === 'in' || type === 'income' || type === 'crédito' || type === 'credito') {
            type = 'entrada';
          } else if (type === 'transferência' || type === 'transferencia' || type === 'transfer') {
            type = 'transferencia';
          } else {
            // Se não reconhecer o tipo, manter como entrada por padrão
            type = 'entrada';
          }
          
          console.log('Processando registro:', { date: validDate, type, description, amount, category, bank });
          
          // Validação básica
          if (amount === 0 || isNaN(amount)) {
            console.log('Ignorando linha com valor inválido:', record);
            continue;
          }

          const financialItem = {
            user_id: user.id,
            date: validDate,
            type: type,
            description: description,
            amount: Math.abs(amount), // Garante que seja positivo
            category: category,
            bank: bank,
            source: 'CSV Import'
          };

          const { error } = await supabase
            .from('financial_items')
            .insert(financialItem);

          if (error) {
            console.error('Erro ao inserir registro:', error, financialItem);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (itemError) {
          console.error('Erro ao processar item:', itemError, record);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Importação concluída!",
          description: `${successCount} registros importados com sucesso.${errorCount > 0 ? ` ${errorCount} registros ignorados devido a erros.` : ''}`,
        });
      } else {
        toast({
          title: "Nenhum registro importado",
          description: "Verifique se o arquivo CSV está no formato correto.",
          variant: "destructive",
        });
      }

      if (successCount > 0) {
        onSuccess();
        onClose();
      }
      setFile(null);
    } catch (error: any) {
      console.error('Erro geral na importação:', error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro durante a importação. Verifique o arquivo e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = "05/02/2025;Salário;entrada;Trabalho;CONTA SIMPLES;5000,00\n06/02/2025;Compras;saida;Alimentação;BRADESCO;150,75\n07/02/2025;PIX;transferencia;Transferência;C6 BANK;200,00";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_importacao.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Importar CSV</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Importe seus registros financeiros usando um arquivo CSV sem cabeçalho. As colunas devem estar na ordem: Data, Descrição, Tipo, Categoria, Banco, Valor.
            </p>
            
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
              className="w-full mb-4"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Template CSV
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Selecionar arquivo CSV
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          {file && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                Arquivo selecionado: {file.name}
              </p>
            </div>
          )}

          <div className="text-xs text-gray-500">
            <p><strong>Formato esperado (sem cabeçalho):</strong></p>
            <p>• Ordem das colunas: Data, Descrição, Tipo, Categoria, Banco, Valor</p>
            <p>• Separadores: vírgula (,), ponto e vírgula (;) ou tab</p>
            <p>• Valores: "R$ 100,50" ou "100.50" ou "100,50"</p>
            <p>• Datas: "05/02/2025", "05-02-2025" ou "2025-02-05"</p>
            <p>• Tipos: "entrada", "saida", "crédito", "débito"</p>
            <p className="mt-2 text-green-600">✓ Dados incompletos serão preenchidos automaticamente</p>
          </div>

          <Button 
            onClick={handleImport} 
            disabled={!file || loading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {loading ? "Importando..." : "Importar Dados"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CSVImportModal;
