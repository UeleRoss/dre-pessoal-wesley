
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { X, ClipboardPaste } from "lucide-react";

interface RawPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RawPasteModal = ({ isOpen, onClose, onSuccess }: RawPasteModalProps) => {
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

  const detectFormat = (line: string): 'format1' | 'format2' => {
    // Detecta separador
    let values;
    if (line.includes('\t')) {
      values = line.split('\t');
    } else if (line.includes(';')) {
      values = line.split(';');
    } else {
      values = line.split(/\s{2,}/);
    }
    
    values = values.map(v => v.trim());
    
    if (values.length < 6) return 'format1';
    
    // Tenta detectar o formato pelos valores
    // Se o 3º campo tem R$ ou é numérico, provavelmente é: data descrição valor tipo banco categoria
    const thirdField = values[2];
    const fourthField = values[3];
    
    // Se o 3º campo tem símbolos de moeda ou é claramente numérico
    if (thirdField.includes('R$') || thirdField.includes('$') || /^[\d.,]+$/.test(thirdField.replace(/R\$\s*/g, ''))) {
      console.log('Formato detectado: data descrição valor tipo banco categoria');
      return 'format2';
    }
    
    // Se o 4º campo tem símbolos de tipo (entrada/saída)
    if (['entrada', 'saida', 'saída', 'transferencia', 'transferência'].some(type => 
        fourthField.toLowerCase().includes(type.toLowerCase()))) {
      console.log('Formato detectado: data descrição tipo categoria banco valor');
      return 'format1';
    }
    
    // Default para formato original
    return 'format1';
  };

  const parseRawText = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    console.log('Total de linhas encontradas:', lines.length);
    
    return lines.map((line, index) => {
      // Detecta separador (tab, ponto e vírgula ou espaços múltiplos)
      let values;
      if (line.includes('\t')) {
        values = line.split('\t');
      } else if (line.includes(';')) {
        values = line.split(';');
      } else {
        // Tenta separar por espaços múltiplos (2 ou mais espaços)
        values = line.split(/\s{2,}/);
      }
      
      values = values.map(v => v.trim());
      console.log(`Linha ${index + 1}:`, values);
      
      // Validação: deve ter pelo menos 6 campos
      if (values.length < 6) {
        console.log(`Linha ${index + 1} ignorada: menos de 6 campos`);
        return null;
      }
      
      // Detecta o formato da linha
      const format = detectFormat(line);
      
      if (format === 'format2') {
        // Formato: data descrição valor tipo banco categoria
        return {
          date: values[0] || '',
          description: values[1] || '',
          amount: values[2] || '',
          type: values[3] || '',
          bank: values[4] || '',
          category: values[5] || ''
        };
      } else {
        // Formato original: data descrição tipo categoria banco valor
        return {
          date: values[0] || '',
          description: values[1] || '',
          type: values[2] || '',
          category: values[3] || '',
          bank: values[4] || '',
          amount: values[5] || ''
        };
      }
    }).filter(Boolean);
  };

  const handleImport = async () => {
    if (!rawText.trim()) {
      toast({
        title: "Erro",
        description: "Cole os dados no campo de texto",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const records = parseRawText(rawText);
      console.log('Registros processados:', records.length);
      console.log('Primeiros 3 registros:', records.slice(0, 3));
      
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      let duplicateCount = 0;
      
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
          
          const validDate = parseDate(record.date);
          const normalizedType = normalizeType(record.type);
          const category = record.category?.trim() || 'Importado';
          const bank = record.bank?.trim() || 'CONTA SIMPLES';
          
          // Verificar duplicata por data+descrição+valor
          const { data: existingItems } = await supabase
            .from('financial_items')
            .select('id')
            .eq('user_id', user.id)
            .eq('date', validDate)
            .eq('description', description)
            .eq('amount', amount);
          
          if (existingItems && existingItems.length > 0) {
            console.log(`Linha ${index + 1} ignorada: duplicata encontrada`);
            duplicateCount++;
            continue;
          }
          
          const financialItem = {
            user_id: user.id,
            date: validDate,
            type: normalizedType,
            description: description,
            amount: amount,
            category: category,
            bank: bank,
            source: 'Raw Paste Import'
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
          description: `${successCount} registros importados com sucesso.${skippedCount > 0 ? ` ${skippedCount} registros ignorados.` : ''}${duplicateCount > 0 ? ` ${duplicateCount} duplicatas ignoradas.` : ''}${errorCount > 0 ? ` ${errorCount} registros com erro.` : ''}`,
        });
      } else {
        toast({
          title: "Nenhum registro importado",
          description: `${skippedCount} registros ignorados. ${duplicateCount} duplicatas encontradas.`,
          variant: "destructive",
        });
      }

      if (successCount > 0) {
        onSuccess();
        onClose();
      }
      setRawText("");
    } catch (error: any) {
      console.error('Erro geral na importação:', error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro durante a importação. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Importar por Colagem (Raw Paste)</DialogTitle>
              <DialogDescription>
                Cole dados financeiros no formato texto para importação rápida
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              O sistema detecta automaticamente entre dois formatos:
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg border space-y-4">
              <div>
                <p className="font-medium text-sm mb-2">Formato 1 (original):</p>
                <p className="text-xs text-gray-600 mb-2"><strong>data descrição tipo categoria banco valor</strong></p>
                <div className="bg-white p-3 rounded border overflow-x-auto">
                  <pre className="text-xs whitespace-pre-wrap break-all">
05/02/2025	Salário Mensal	entrada	Pro-Labore	CONTA SIMPLES	R$ 5.000,00
                  </pre>
                </div>
              </div>
              
              <div>
                <p className="font-medium text-sm mb-2">Formato 2 (seu formato):</p>
                <p className="text-xs text-gray-600 mb-2"><strong>data descrição valor tipo banco categoria</strong></p>
                <div className="bg-white p-3 rounded border overflow-x-auto">
                  <pre className="text-xs whitespace-pre-wrap break-all">
2025-05-30	blackdog	R$ 46,00	Saída	C6 BANK	Comida
                  </pre>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-xs text-blue-800 space-y-2">
                <div>
                  <p className="font-medium">Separadores aceitos:</p>
                  <p>Tab, ponto e vírgula (;) ou espaços duplos</p>
                </div>
                <div>
                  <p className="font-medium">Validações aplicadas:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Descrição obrigatória (linhas sem descrição são ignoradas)</li>
                    <li>Valor deve ser maior que zero</li>
                    <li>Data no formato DD/MM/AAAA ou AAAA-MM-DD</li>
                    <li>Duplicatas são ignoradas (mesmo data+descrição+valor)</li>
                    <li>Valores com R$ e vírgula decimal são convertidos automaticamente</li>
                    <li>Sistema detecta automaticamente qual formato você está usando</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rawtext" className="text-sm font-medium">
              Cole seus dados aqui
            </Label>
            <Textarea
              id="rawtext"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Cole suas linhas de dados aqui..."
              className="min-h-[200px] font-mono text-sm resize-none"
            />
          </div>

          <Button 
            onClick={handleImport} 
            disabled={!rawText.trim() || loading}
            className="w-full"
          >
            <ClipboardPaste className="h-4 w-4 mr-2" />
            {loading ? "Importando..." : "Importar Dados"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RawPasteModal;
