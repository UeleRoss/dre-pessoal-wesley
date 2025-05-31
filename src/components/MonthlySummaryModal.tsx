
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { X, ClipboardPaste } from "lucide-react";

interface MonthlySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MonthlySummaryModal = ({ isOpen, onClose, onSuccess }: MonthlySummaryModalProps) => {
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const parseMonth = (monthStr: string): string => {
    console.log('Convertendo mês:', monthStr);
    
    if (!monthStr || monthStr.trim() === '') {
      throw new Error('Mês não pode estar vazio');
    }

    const cleanMonth = monthStr.trim();
    
    // Se já está no formato YYYY-MM
    const monthRegex = /^(\d{4})-(\d{2})$/;
    const match = cleanMonth.match(monthRegex);
    
    if (match) {
      const [, year, month] = match;
      const monthNum = parseInt(month);
      
      if (monthNum >= 1 && monthNum <= 12) {
        const formattedDate = `${year}-${month}-01`;
        console.log('Mês convertido para:', formattedDate);
        return formattedDate;
      }
    }
    
    throw new Error(`Formato de mês inválido: ${cleanMonth}. Use YYYY-MM (ex: 2024-06)`);
  };

  const parseAmount = (amountStr: string): number => {
    if (!amountStr) throw new Error('Valor não pode estar vazio');
    
    // Remove R$ e espaços
    let cleanAmount = amountStr.toString()
      .replace(/R\$\s*/g, '')
      .replace(/\s+/g, '')
      .trim();
    
    console.log('Parsing amount:', amountStr, '-> cleaned:', cleanAmount);
    
    // Substitui vírgula por ponto para decimal
    if (cleanAmount.includes(',')) {
      cleanAmount = cleanAmount.replace(',', '.');
    }
    
    // Remove pontos que são separadores de milhares (mantém apenas o último ponto se for decimal)
    const parts = cleanAmount.split('.');
    if (parts.length > 2) {
      // Múltiplos pontos - todos exceto o último são separadores de milhares
      const integerPart = parts.slice(0, -1).join('');
      const decimalPart = parts[parts.length - 1];
      cleanAmount = integerPart + '.' + decimalPart;
    }
    
    // Remove caracteres não numéricos exceto ponto
    cleanAmount = cleanAmount.replace(/[^\d.-]/g, '');
    
    const parsed = parseFloat(cleanAmount);
    if (isNaN(parsed) || parsed <= 0) {
      throw new Error(`Valor inválido: ${amountStr}`);
    }
    
    console.log('Final parsed amount:', parsed);
    return parsed;
  };

  const parseRawText = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    console.log('Total de linhas encontradas:', lines.length);
    
    return lines.map((line, index) => {
      console.log(`Processando linha ${index + 1}:`, line);
      
      // Detecta separador (tab ou ponto e vírgula)
      let values;
      if (line.includes('\t')) {
        values = line.split('\t');
      } else if (line.includes(';')) {
        values = line.split(';');
      } else {
        throw new Error(`Linha ${index + 1}: Use TAB ou ponto e vírgula (;) como separador`);
      }
      
      values = values.map(v => v.trim());
      console.log(`Linha ${index + 1} valores:`, values);
      
      // Deve ter exatamente 3 campos: mês, categoria, valor
      if (values.length !== 3) {
        throw new Error(`Linha ${index + 1}: Deve ter exatamente 3 campos (mês, categoria, valor). Encontrados: ${values.length}`);
      }
      
      return {
        month: values[0] || '',
        category: values[1] || '',
        amount: values[2] || ''
      };
    });
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
      
      let successCount = 0;
      let errorCount = 0;
      let duplicateCount = 0;
      
      for (const [index, record] of records.entries()) {
        try {
          const month = parseMonth(record.month);
          const amount = parseAmount(record.amount);
          const category = record.category?.trim();
          
          if (!category || category === '') {
            throw new Error(`Linha ${index + 1}: Categoria não pode estar vazia`);
          }
          
          // Verificar duplicata
          const { data: existing } = await supabase
            .from('financial_summary')
            .select('id')
            .eq('user_id', user.id)
            .eq('month', month)
            .eq('category', category);
          
          if (existing && existing.length > 0) {
            console.log(`Linha ${index + 1} ignorada: duplicata encontrada`);
            duplicateCount++;
            continue;
          }
          
          const summaryItem = {
            user_id: user.id,
            month: month,
            category: category,
            total_value: amount
          };

          console.log(`Inserindo resumo ${index + 1}:`, summaryItem);

          const { error } = await supabase
            .from('financial_summary')
            .insert(summaryItem);

          if (error) {
            console.error('Erro ao inserir resumo:', error, summaryItem);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (itemError: any) {
          console.error(`Erro ao processar linha ${index + 1}:`, itemError.message, record);
          toast({
            title: "Erro na linha " + (index + 1),
            description: itemError.message,
            variant: "destructive",
          });
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Importação concluída!",
          description: `${successCount} resumos importados com sucesso.${duplicateCount > 0 ? ` ${duplicateCount} duplicatas ignoradas.` : ''}${errorCount > 0 ? ` ${errorCount} linhas com erro.` : ''}`,
        });
      } else {
        toast({
          title: "Nenhum resumo importado",
          description: `${duplicateCount} duplicatas encontradas. ${errorCount} linhas com erro.`,
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
        description: error.message || "Ocorreu um erro durante a importação. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Importar Resumos Mensais</DialogTitle>
              <DialogDescription>
                Cole dados históricos agregados por mês e categoria
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
              Use este formato para importar resumos históricos mensais:
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="font-medium text-sm mb-2">Formato obrigatório:</p>
              <p className="text-xs text-gray-600 mb-2"><strong>mês TAB categoria TAB valor</strong></p>
              <div className="bg-white p-3 rounded border overflow-x-auto">
                <pre className="text-xs whitespace-pre-wrap">
2024-06	Apartamento	R$ 2.331,59
2024-06	Escritório	R$ 6.271,66
2024-06	Comida	R$ 757,54
2024-07	Apartamento	R$ 2.400,00
2024-07	Comida	R$ 850,30
                </pre>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="text-xs text-blue-800 space-y-2">
                <div>
                  <p className="font-medium">Regras importantes:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Separador:</strong> Use TAB ou ponto e vírgula (;)</li>
                    <li><strong>Mês:</strong> Formato YYYY-MM (ex: 2024-06)</li>
                    <li><strong>Categoria:</strong> Nome da categoria (obrigatório)</li>
                    <li><strong>Valor:</strong> Aceita R$ e vírgula decimal</li>
                    <li><strong>Duplicatas:</strong> São ignoradas automaticamente</li>
                  </ul>
                </div>
                <div className="mt-3 p-2 bg-blue-100 rounded">
                  <p className="font-medium text-blue-900">💡 Dica:</p>
                  <p className="text-blue-900">Estes resumos servem para fechar o passado. Daqui em diante, registre cada gasto detalhadamente usando o botão "Novo Lançamento".</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlydata" className="text-sm font-medium">
              Cole seus resumos mensais aqui
            </Label>
            <Textarea
              id="monthlydata"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="2024-06	Apartamento	R$ 2.331,59
2024-06	Escritório	R$ 6.271,66
2024-06	Comida	R$ 757,54"
              className="min-h-[200px] font-mono text-sm resize-none"
            />
          </div>

          <Button 
            onClick={handleImport} 
            disabled={!rawText.trim() || loading}
            className="w-full"
          >
            <ClipboardPaste className="h-4 w-4 mr-2" />
            {loading ? "Importando..." : "Importar Resumos"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlySummaryModal;
