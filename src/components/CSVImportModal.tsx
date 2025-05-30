import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { X, Upload, Download } from "lucide-react";
import * as XLSX from 'xlsx';

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
    if (selectedFile && (selectedFile.type === 'text/csv' || 
        selectedFile.name.endsWith('.xlsx') || 
        selectedFile.name.endsWith('.xls'))) {
      setFile(selectedFile);
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo CSV ou XLSX válido.",
        variant: "destructive",
      });
    }
  };

  const detectSeparator = (text: string) => {
    const firstLine = text.split('\n')[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    
    if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
    return semicolonCount > commaCount ? ';' : ',';
  };

  const parseCSV = (text: string) => {
    const separator = detectSeparator(text);
    console.log('Separador detectado:', separator);
    
    const lines = text.split('\n').filter(line => line.trim() !== '');
    console.log('Total de linhas encontradas:', lines.length);
    
    return lines.map((line, index) => {
      const values = line.split(separator).map(v => v.trim().replace(/"/g, ''));
      console.log(`Linha ${index + 1}:`, values);
      
      // Validação: deve ter pelo menos 6 colunas
      if (values.length < 6) {
        console.log(`Linha ${index + 1} ignorada: menos de 6 colunas`);
        return null;
      }
      
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

  const parseXLSX = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Pega a primeira planilha
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Converte para JSON (array de arrays)
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          console.log('Dados da planilha:', jsonData);
          
          // Filtra linhas vazias e mapeia para o formato esperado
          const records = jsonData
            .filter((row: any) => row && row.length >= 6 && row[1]) // Verifica se tem dados suficientes
            .map((row: any, index: number) => {
              console.log(`Linha ${index + 1}:`, row);
              
              return {
                date: row[0] ? row[0].toString() : '',
                description: row[1] ? row[1].toString() : '',
                type: row[2] ? row[2].toString() : '',
                category: row[3] ? row[3].toString() : '',
                bank: row[4] ? row[4].toString() : '',
                amount: row[5] ? row[5].toString() : ''
              };
            });
          
          console.log('Registros processados da planilha:', records.length);
          resolve(records);
        } catch (error) {
          console.error('Erro ao processar XLSX:', error);
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseDate = (dateStr: string): string => {
    console.log('Convertendo data:', dateStr);
    
    if (!dateStr || dateStr.trim() === '') {
      const today = new Date().toISOString().split('T')[0];
      console.log('Data vazia, usando data atual:', today);
      return today;
    }

    const cleanDate = dateStr.trim();
    
    // Se já está no formato YYYY-MM-DD
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (isoDateRegex.test(cleanDate)) {
      const testDate = new Date(cleanDate);
      if (!isNaN(testDate.getTime())) {
        console.log('Data válida no formato ISO:', cleanDate);
        return cleanDate;
      }
    }

    // Formato brasileiro DD/MM/YYYY ou DD/MM/YY
    const brDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
    const brMatch = cleanDate.match(brDateRegex);
    if (brMatch) {
      let [, day, month, year] = brMatch;
      
      // Ajusta o ano se for de 2 dígitos
      if (year.length === 2) {
        const yearNum = parseInt(year);
        year = yearNum > 50 ? `19${year}` : `20${year}`;
      }

      const dayPadded = day.padStart(2, '0');
      const monthPadded = month.padStart(2, '0');
      
      const formattedDate = `${year}-${monthPadded}-${dayPadded}`;
      
      // Valida a data
      const testDate = new Date(formattedDate);
      if (!isNaN(testDate.getTime()) && 
          testDate.getFullYear() == parseInt(year) &&
          testDate.getMonth() + 1 == parseInt(month) &&
          testDate.getDate() == parseInt(day)) {
        console.log('Data convertida de', cleanDate, 'para', formattedDate);
        return formattedDate;
      }
    }

    // Se não conseguiu converter, usa data atual
    const fallbackDate = new Date().toISOString().split('T')[0];
    console.log('Não foi possível converter a data', cleanDate, ', usando data atual:', fallbackDate);
    return fallbackDate;
  };

  const normalizeType = (type: string): string => {
    if (!type) return 'entrada';
    
    const normalized = type.toLowerCase().trim();
    
    if (['saída', 'saida', 'out', 'expense', 'débito', 'debito', 'despesa', 'gasto'].includes(normalized)) {
      return 'saida';
    } else if (['entrada', 'in', 'income', 'crédito', 'credito', 'receita'].includes(normalized)) {
      return 'entrada';
    } else if (['transferência', 'transferencia', 'transfer'].includes(normalized)) {
      return 'transferencia';
    }
    
    // Por padrão, assume entrada
    return 'entrada';
  };

  const parseAmount = (amountStr: string): number => {
    if (!amountStr) return 0;
    
    // Remove currency symbols (R$, $, etc.) and extra spaces
    let cleanAmount = amountStr.toString()
      .replace(/R\$\s*/g, '') // Remove R$ and spaces after it
      .replace(/\$\s*/g, '')  // Remove $ and spaces after it
      .replace(/\s+/g, '')    // Remove all spaces
      .trim();
    
    console.log('Parsing amount:', amountStr, '-> cleaned:', cleanAmount);
    
    // Handle Brazilian format: 1.391,76 (dot as thousands separator, comma as decimal)
    if (cleanAmount.includes('.') && cleanAmount.includes(',')) {
      // Check if it's Brazilian format (more digits before comma than after)
      const parts = cleanAmount.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        // This is likely Brazilian format: remove dots (thousands) and replace comma with dot (decimal)
        cleanAmount = cleanAmount.replace(/\./g, '').replace(',', '.');
        console.log('Brazilian format detected:', cleanAmount);
      }
    } 
    // Handle cases with only comma (could be decimal or thousands separator)
    else if (cleanAmount.includes(',') && !cleanAmount.includes('.')) {
      const parts = cleanAmount.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        // Probably decimal separator
        cleanAmount = cleanAmount.replace(',', '.');
        console.log('Comma as decimal detected:', cleanAmount);
      } else {
        // Probably thousands separator
        cleanAmount = cleanAmount.replace(/,/g, '');
        console.log('Comma as thousands detected:', cleanAmount);
      }
    }
    // Handle cases with only dots
    else if (cleanAmount.includes('.') && !cleanAmount.includes(',')) {
      const parts = cleanAmount.split('.');
      if (parts.length === 2 && parts[1].length <= 2) {
        // Probably decimal separator - keep as is
        console.log('Dot as decimal detected:', cleanAmount);
      } else if (parts.length > 2) {
        // Multiple dots - probably thousands separators except the last one
        const lastDotIndex = cleanAmount.lastIndexOf('.');
        const beforeLastDot = cleanAmount.substring(0, lastDotIndex);
        const afterLastDot = cleanAmount.substring(lastDotIndex + 1);
        
        if (afterLastDot.length <= 2) {
          // Last dot is decimal, others are thousands
          cleanAmount = beforeLastDot.replace(/\./g, '') + '.' + afterLastDot;
          console.log('Multiple dots with decimal detected:', cleanAmount);
        } else {
          // All dots are thousands separators
          cleanAmount = cleanAmount.replace(/\./g, '');
          console.log('All dots as thousands detected:', cleanAmount);
        }
      }
    }
    
    // Remove any remaining non-numeric characters except dot
    cleanAmount = cleanAmount.replace(/[^\d.-]/g, '');
    
    const parsed = parseFloat(cleanAmount);
    const result = isNaN(parsed) ? 0 : Math.abs(parsed);
    
    console.log('Final parsed amount:', result);
    return result;
  };

  const handleImport = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let records;
      
      // Determina se é CSV ou XLSX e processa adequadamente
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        console.log('Processando arquivo XLSX...');
        records = await parseXLSX(file);
      } else {
        console.log('Processando arquivo CSV...');
        const text = await file.text();
        records = parseCSV(text);
      }
      
      console.log('Registros processados:', records.length);
      console.log('Primeiros 3 registros:', records.slice(0, 3));
      
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      
      for (const [index, record] of records.entries()) {
        try {
          const amount = parseAmount(record.amount);
          const description = record.description?.trim();
          
          // Validações básicas
          if (!description || description === '') {
            console.log(`Linha ${index + 1} ignorada: sem descrição`);
            skippedCount++;
            continue;
          }
          
          if (amount === 0) {
            console.log(`Linha ${index + 1} ignorada: valor zero ou inválido`);
            skippedCount++;
            continue;
          }
          
          // Validação de valor absurdo (maior que 1 milhão)
          if (amount > 1000000) {
            console.log(`Linha ${index + 1} ignorada: valor muito alto (${amount})`);
            skippedCount++;
            continue;
          }
          
          const validDate = parseDate(record.date);
          const normalizedType = normalizeType(record.type);
          const category = record.category?.trim() || 'Importado';
          const bank = record.bank?.trim() || 'CONTA SIMPLES';
          
          const financialItem = {
            user_id: user.id,
            date: validDate,
            type: normalizedType,
            description: description,
            amount: amount,
            category: category,
            bank: bank,
            source: file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'XLSX Import' : 'CSV Import'
          };

          console.log(`Inserindo registro ${index + 1}:`, financialItem);

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
          console.error(`Erro ao processar item ${index + 1}:`, itemError, record);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Importação concluída!",
          description: `${successCount} registros importados com sucesso.${skippedCount > 0 ? ` ${skippedCount} registros ignorados (sem descrição ou valor inválido).` : ''}${errorCount > 0 ? ` ${errorCount} registros com erro.` : ''}`,
        });
      } else {
        toast({
          title: "Nenhum registro importado",
          description: `${skippedCount} registros ignorados por não atenderem aos critérios (descrição obrigatória, valor válido).`,
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
    const template = "05/02/2025;Salário Mensal;entrada;Pro-Labore;CONTA SIMPLES;5000,00\n06/02/2025;Compras Supermercado;saida;Comida;BRADESCO;150,75\n07/02/2025;Transferência PIX;transferencia;Entre bancos;C6 BANK;200,00";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_importacao.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadXLSXTemplate = () => {
    // Criar uma planilha de exemplo
    const data = [
      ['05/02/2025', 'Salário Mensal', 'entrada', 'Pro-Labore', 'CONTA SIMPLES', '5000,00'],
      ['06/02/2025', 'Compras Supermercado', 'saida', 'Comida', 'BRADESCO', '150,75'],
      ['07/02/2025', 'Transferência PIX', 'transferencia', 'Entre bancos', 'C6 BANK', '200,00']
    ];
    
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lançamentos');
    
    XLSX.writeFile(workbook, 'template_importacao.xlsx');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Importar CSV/XLSX</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Importe seus registros financeiros usando um arquivo CSV ou XLSX. As colunas devem estar na ordem: Data, Descrição, Tipo, Categoria, Banco, Valor.
            </p>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button 
                variant="outline" 
                onClick={downloadTemplate}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Template CSV
              </Button>
              
              <Button 
                variant="outline" 
                onClick={downloadXLSXTemplate}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Template XLSX
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Selecionar arquivo CSV ou XLSX
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          {file && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                Arquivo selecionado: {file.name}
              </p>
              <p className="text-xs text-gray-600">
                Tipo: {file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'Excel (XLSX)' : 'CSV'}
              </p>
            </div>
          )}

          <div className="text-xs text-gray-500">
            <p><strong>Validações aplicadas:</strong></p>
            <p>• Descrição obrigatória (linhas sem descrição são ignoradas)</p>
            <p>• Valor deve ser maior que zero e menor que R$ 1.000.000</p>
            <p>• Data no formato DD/MM/AAAA ou AAAA-MM-DD</p>
            <p>• Tipos aceitos: entrada, saida, transferencia</p>
            <p>• Para CSV: separadores vírgula (,), ponto e vírgula (;) ou tab</p>
            <p>• Para XLSX: dados da primeira planilha</p>
            <p className="mt-2 text-green-600">✓ Dados inválidos serão ignorados com relatório detalhado</p>
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
