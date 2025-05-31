
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
    const lines = text.trim().split('\n').filter(line => line.trim());
    const parsedData = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const columns = line.split('\t');
      
      if (columns.length !== 3) {
        errors.push(`Linha ${i + 1}: Esperado 3 colunas, encontrado ${columns.length} - "${line}"`);
        continue;
      }

      const [monthStr, source, valueStr] = columns.map(col => col.trim());

      // Validar formato do mês (AAAA-MM)
      const monthMatch = monthStr.match(/^(\d{4})-(\d{2})$/);
      if (!monthMatch) {
        errors.push(`Linha ${i + 1}: Formato de mês inválido "${monthStr}" - esperado AAAA-MM`);
        continue;
      }

      // Converter mês para formato de data (AAAA-MM-01)
      const monthDate = `${monthStr}-01`;

      // Validar e converter valor
      let cleanValue = valueStr.replace(/R\$\s?/, '').replace(',', '.');
      const numericValue = parseFloat(cleanValue);
      
      if (isNaN(numericValue) || numericValue <= 0) {
        errors.push(`Linha ${i + 1}: Valor inválido "${valueStr}" - deve ser maior que zero`);
        continue;
      }

      // Validar fonte não vazia
      if (!source || source.trim() === '') {
        errors.push(`Linha ${i + 1}: Fonte da receita não pode estar vazia`);
        continue;
      }

      parsedData.push({
        month: monthDate,
        source: source.trim(),
        total_value: numericValue
      });
    }

    return { parsedData, errors };
  };

  const handleImport = async () => {
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

      // Inserir dados no banco
      const { error } = await supabase
        .from('financial_summary_income')
        .insert(parsedData);

      if (error) {
        console.error("Erro ao inserir resumos de receita:", error);
        toast({
          title: "Erro",
          description: "Erro ao salvar os dados: " + error.message,
          variant: "destructive",
        });
        return;
      }

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
              Formato esperado: AAAA-MM (ex: 2024-06), fonte da receita, valor com R$ e vírgula decimal
            </p>
            <Textarea
              placeholder="2024-06	Vendas Online	R$ 15.230,50
2024-07	Consultoria	R$ 8.500,00"
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
