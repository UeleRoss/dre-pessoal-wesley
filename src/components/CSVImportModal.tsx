
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
    
    // Usa o separador que aparece mais vezes
    return semicolonCount > commaCount ? ';' : ',';
  };

  const parseCSV = (text: string) => {
    const separator = detectSeparator(text);
    console.log('Separador detectado:', separator);
    
    const lines = text.split('\n');
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
    
    console.log('Headers encontrados:', headers);
    
    return lines.slice(1).map(line => {
      if (line.trim() === '') return null;
      const values = line.split(separator).map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    }).filter(Boolean);
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
          // Mapeamento flexível dos campos
          const date = record.date || record.data || record.d || new Date().toISOString().split('T')[0];
          let type = (record.type || record.tipo || record.t || 'entrada').toLowerCase().trim();
          const description = record.description || record.descricao || record.desc || 'Sem descrição';
          
          // Limpa o valor removendo "R$", espaços e convertendo vírgula para ponto
          let amountStr = (record.amount || record.valor || record.v || '0').toString();
          amountStr = amountStr.replace(/[R$\s]/g, '').replace(',', '.');
          const amount = parseFloat(amountStr);
          
          const category = record.category || record.categoria || record.cat || 'Sem categoria';
          const bank = record.bank || record.banco || record.b || 'CONTA SIMPLES';
          
          // Normalizar o tipo para garantir que seja reconhecido corretamente
          if (type === 'saída' || type === 'saida' || type === 'out' || type === 'expense') {
            type = 'saida';
          } else if (type === 'entrada' || type === 'in' || type === 'income') {
            type = 'entrada';
          } else if (type === 'transferência' || type === 'transferencia' || type === 'transfer') {
            type = 'transferencia';
          } else {
            // Se não reconhecer o tipo, manter como entrada por padrão
            type = 'entrada';
          }
          
          console.log('Processando registro:', { date, type, description, amount, category, bank });
          
          // Validação básica
          if (amount === 0 || isNaN(amount)) {
            console.log('Ignorando linha com valor inválido:', record);
            continue;
          }

          // Validação de data
          let validDate = date;
          if (!date || date === '') {
            validDate = new Date().toISOString().split('T')[0];
          } else {
            // Tenta converter diferentes formatos de data
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
              console.log('Data inválida, usando data atual:', date);
              validDate = new Date().toISOString().split('T')[0];
            } else {
              validDate = dateObj.toISOString().split('T')[0];
            }
          }

          const financialItem = {
            user_id: user.id,
            date: validDate,
            type: type,
            description: description || 'Importado do CSV',
            amount: Math.abs(amount), // Garante que seja positivo
            category: category || 'Importado',
            bank: bank || 'CONTA SIMPLES',
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
    const template = "date;type;description;amount;category;bank\n2024-01-01;entrada;Salário;5000,00;Trabalho;CONTA SIMPLES\n2024-01-02;saida;Compras;150,75;Alimentação;BRADESCO\n2024-01-03;transferencia;PIX;200,00;Transferência;C6 BANK";
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
              Importe seus registros financeiros usando um arquivo CSV. O sistema detecta automaticamente o separador (vírgula ou ponto e vírgula).
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
            <p><strong>Formatos aceitos:</strong></p>
            <p>• Separadores: vírgula (,) ou ponto e vírgula (;)</p>
            <p>• Valores: "R$ 100,50" ou "100.50"</p>
            <p>• Campos: date, type, description, amount, category, bank</p>
            <p>• Tipos: "entrada", "saida", "transferencia"</p>
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
