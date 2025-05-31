
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface IncomeSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const IncomeSummaryModal = ({ isOpen, onClose, onSuccess }: IncomeSummaryModalProps) => {
  const [textData, setTextData] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const validateAndParseData = (text: string) => {
    console.log("Texto recebido para validação:", text);
    const lines = text.trim().split('\n').filter(line => line.trim());
    console.log("Linhas encontradas:", lines);
    
    const parsedData = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      console.log(`Processando linha ${i + 1}:`, line);
      
      const columns = line.split('\t');
      console.log(`Colunas encontradas na linha ${i + 1}:`, columns);
      
      if (columns.length !== 3) {
        errors.push(`Linha ${i + 1}: Esperado 3 colunas, encontrado ${columns.length} - "${line}"`);
        continue;
      }

      const [monthStr, source, valueStr] = columns.map(col => col.trim());
      console.log(`Dados extraídos - Mês: "${monthStr}", Fonte: "${source}", Valor: "${valueStr}"`);

      // Validar formato do mês (AAAA-MM)
      const monthMatch = monthStr.match(/^(\d{4})-(\d{2})$/);
      if (!monthMatch) {
        errors.push(`Linha ${i + 1}: Formato de mês inválido "${monthStr}" - esperado AAAA-MM`);
        continue;
      }

      // Converter mês para formato de data (AAAA-MM-01)
      const monthDate = `${monthStr}-01`;
      console.log(`Data convertida: ${monthDate}`);

      // Validar e converter valor
      let cleanValue = valueStr.replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.');
      console.log(`Valor limpo: "${cleanValue}"`);
      
      const numericValue = parseFloat(cleanValue);
      console.log(`Valor numérico: ${numericValue}`);
      
      if (isNaN(numericValue) || numericValue <= 0) {
        errors.push(`Linha ${i + 1}: Valor inválido "${valueStr}" - deve ser maior que zero`);
        continue;
      }

      // Validar fonte não vazia
      if (!source || source.trim() === '') {
        errors.push(`Linha ${i + 1}: Fonte da receita não pode estar vazia`);
        continue;
      }

      const parsedItem = {
        month: monthDate,
        source: source.trim(),
        total_value: numericValue
      };
      
      console.log(`Item validado:`, parsedItem);
      parsedData.push(parsedItem);
    }

    console.log("Dados finais validados:", parsedData);
    console.log("Erros encontrados:", errors);
    return { parsedData, errors };
  };

  const handleImport = async () => {
    console.log("Iniciando importação...");
    
    if (!textData.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, cole os dados para importar",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { parsedData, errors } = validateAndParseData(textData);

      if (errors.length > 0) {
        console.error("Erros de validação:", errors);
        toast({
          title: "Erro de Validação",
          description: `Problemas encontrados:\n${errors.join('\n')}`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (parsedData.length === 0) {
        toast({
          title: "Erro",
          description: "Nenhum dado válido encontrado para importar",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      console.log("Inserindo dados no Supabase:", parsedData);

      // Inserir dados no banco
      const { data, error } = await supabase
        .from('financial_summary_income')
        .insert(parsedData)
        .select();

      if (error) {
        console.error("Erro ao inserir resumos de receita:", error);
        toast({
          title: "Erro",
          description: "Erro ao salvar os dados: " + error.message,
          variant: "destructive",
        });
        return;
      }

      console.log("Dados inseridos com sucesso:", data);

      toast({
        title: "Sucesso",
        description: `${parsedData.length} resumos de receita importados com sucesso!`,
      });

      setTextData("");
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error("Erro durante importação:", error);
      toast({
        title: "Erro",
        description: "Erro inesperado durante a importação: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTextData("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Importar Resumos Mensais de Receitas</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Cole os dados separados por TAB na ordem: <strong>mês, fonte, valor</strong>
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Formato esperado: AAAA-MM (ex: 2024-06), fonte da receita, valor com R$ opcional
            </p>
            <Textarea
              placeholder="2024-06	Go On Outdoor	R$ 4.000,00
2024-07	Consultoria	8.500,00"
              value={textData}
              onChange={(e) => setTextData(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={isLoading || !textData.trim()}
            >
              {isLoading ? "Importando..." : "Importar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomeSummaryModal;
