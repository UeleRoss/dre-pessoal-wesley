
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

  const parseCSV = (text: string) => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      if (line.trim() === '') return null;
      const values = line.split(',').map(v => v.trim());
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
      
      const financialItems = records.map((record: any) => ({
        user_id: user.id,
        date: record.date || record.data,
        type: record.type || record.tipo || 'entrada',
        description: record.description || record.descricao || '',
        amount: parseFloat(record.amount || record.valor || '0'),
        category: record.category || record.categoria || '',
        bank: record.bank || record.banco || 'CONTA SIMPLES',
        source: 'CSV Import'
      }));

      const { error } = await supabase
        .from('financial_items')
        .insert(financialItems);

      if (error) throw error;

      toast({
        title: "Importação concluída!",
        description: `${financialItems.length} registros importados com sucesso.`,
      });

      onSuccess();
      onClose();
      setFile(null);
    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = "date,type,description,amount,category,bank\n2024-01-01,entrada,Salário,5000.00,Trabalho,CONTA SIMPLES";
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
              Importe seus registros financeiros dos últimos 2 anos usando um arquivo CSV.
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
            <p>Formato esperado do CSV:</p>
            <p>date, type, description, amount, category, bank</p>
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
