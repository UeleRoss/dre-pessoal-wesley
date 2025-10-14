import { useState } from "react";
import { X, Upload, CheckCircle, AlertCircle, FileText, Lock, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseBankStatementPDF, ParsedTransaction } from "@/services/pdfParser";
import { checkForDuplicates, getDuplicateStats, DuplicateCheckResult } from "@/services/duplicateDetector";

interface PDFImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

const PDFImportModal = ({ isOpen, onClose, onSuccess, userId }: PDFImportModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<ParsedTransaction[] | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const [duplicateResults, setDuplicateResults] = useState<DuplicateCheckResult[] | null>(null);
  const [bankName, setBankName] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setPreview(null);
      setDuplicateResults(null);
      setErrors([]);
      setBankName(null);
      setPassword("");
      setNeedsPassword(false);
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo PDF",
        variant: "destructive",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setPreview(null);
      setDuplicateResults(null);
      setErrors([]);
      setBankName(null);
      setPassword("");
      setNeedsPassword(false);
    } else {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo PDF",
        variant: "destructive",
      });
    }
  };

  const handleProcessPDF = async () => {
    if (!file) return;

    setIsProcessing(true);
    setErrors([]);

    try {
      const result = await parseBankStatementPDF(file, password || undefined);

      // Verificar se precisa de senha
      if (result.needsPassword) {
        setNeedsPassword(true);
        setErrors(result.errors);
        toast({
          title: password ? "Senha incorreta" : "PDF protegido",
          description: result.errors[0],
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      if (result.success && result.transactions.length > 0) {
        setBankName(result.bankName || null);

        // Verificar duplicatas
        const duplicateCheck = await checkForDuplicates(result.transactions, userId);
        setDuplicateResults(duplicateCheck);

        // Filtrar apenas não duplicatas para preview
        const nonDuplicates = duplicateCheck.filter(r => !r.isDuplicate).map(r => r.transaction);
        setPreview(nonDuplicates);

        // Selecionar todas as transações por padrão
        setSelectedTransactions(new Set(nonDuplicates.map((_, idx) => idx)));

        const stats = getDuplicateStats(duplicateCheck);

        if (result.errors.length > 0) {
          setErrors(result.errors);
        }

        toast({
          title: "PDF processado!",
          description: `${stats.unique} transações novas, ${stats.duplicates} duplicatas ignoradas`,
        });
      } else {
        setErrors(result.errors);
        toast({
          title: "Erro ao processar PDF",
          description: result.errors[0] || "Não foi possível extrair transações",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao processar PDF:", error);
      toast({
        title: "Erro",
        description: "Erro ao processar o arquivo PDF",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Funções de seleção
  const handleToggleTransaction = (index: number) => {
    setSelectedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (!preview) return;
    setSelectedTransactions(new Set(preview.map((_, idx) => idx)));
  };

  const handleDeselectAll = () => {
    setSelectedTransactions(new Set());
  };

  const handleSelectCurrentMonth = () => {
    if (!preview) return;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const indices = preview
      .map((transaction, idx) => {
        const transactionDate = new Date(transaction.date);
        if (
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        ) {
          return idx;
        }
        return -1;
      })
      .filter(idx => idx !== -1);

    setSelectedTransactions(new Set(indices));
  };

  const handleImport = async () => {
    if (!preview || preview.length === 0 || selectedTransactions.size === 0) {
      toast({
        title: "Nenhuma transação selecionada",
        description: "Selecione pelo menos uma transação para importar",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    try {
      // Filtrar apenas transações selecionadas
      const selectedItems = preview.filter((_, idx) => selectedTransactions.has(idx));

      const itemsToInsert = selectedItems.map((transaction) => ({
        user_id: userId,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        category: "Sem categoria",
        bank: bankName || "Importado",
        date: transaction.date,
        needs_review: true,
        imported_from: `PDF - ${bankName || 'Extrato Bancário'}`,
        business_unit_id: null,
      }));

      const { error } = await supabase
        .from('financial_items')
        .insert(itemsToInsert);

      if (error) throw error;

      toast({
        title: "Importação concluída!",
        description: `${selectedTransactions.size} lançamentos importados com sucesso`,
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Erro ao importar transações:", error);
      toast({
        title: "Erro ao importar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setSelectedTransactions(new Set());
    setDuplicateResults(null);
    setErrors([]);
    setBankName(null);
    setPassword("");
    setNeedsPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importar Extrato Bancário (PDF)
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Upload Area */}
          {!preview && (
            <div>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">
                    {file ? file.name : "Selecione ou arraste o PDF aqui"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Formatos suportados: C6 Bank, Nubank (em breve mais bancos)
                  </p>
                </label>
              </div>

              {file && (
                <div className="mt-4 space-y-4">
                  {/* Campo de senha (aparece se needsPassword) */}
                  {needsPassword && (
                    <div>
                      <Label htmlFor="pdf-password" className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Senha do PDF
                      </Label>
                      <Input
                        id="pdf-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Digite a senha do PDF"
                        className="mt-2"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleProcessPDF();
                          }
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Este PDF está protegido. Digite a senha para continuar.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-center">
                    <Button
                      onClick={handleProcessPDF}
                      disabled={isProcessing || (needsPassword && !password)}
                      className="w-full md:w-auto"
                    >
                      {isProcessing ? "Processando..." : needsPassword ? "Tentar com Senha" : "Processar PDF"}
                    </Button>
                  </div>
                </div>
              )}

              {errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900">Erros encontrados:</p>
                      <ul className="mt-2 space-y-1 text-sm text-red-800">
                        {errors.map((error, idx) => (
                          <li key={idx}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {preview && preview.length > 0 && (
            <div>
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900">
                      {preview.length} transações novas para importar
                    </p>
                    {bankName && (
                      <p className="text-sm text-blue-700">Banco: {bankName}</p>
                    )}
                    {duplicateResults && getDuplicateStats(duplicateResults).duplicates > 0 && (
                      <p className="text-sm text-orange-700 mt-1 font-medium">
                        ⚠️ {getDuplicateStats(duplicateResults).duplicates} duplicatas foram ignoradas automaticamente
                      </p>
                    )}
                    <p className="text-sm text-blue-700 mt-1">
                      Estes lançamentos serão marcados para revisão. Você poderá categorizá-los depois.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botões de seleção */}
              <div className="mb-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="flex-1 md:flex-none"
                >
                  Selecionar Todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectCurrentMonth}
                  className="flex-1 md:flex-none"
                >
                  Selecionar Mês Atual
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="flex-1 md:flex-none"
                >
                  Desmarcar Todos
                </Button>
                <div className="flex-1 md:flex-none ml-auto">
                  <Badge variant="secondary" className="text-sm">
                    {selectedTransactions.size} de {preview.length} selecionadas
                  </Badge>
                </div>
              </div>

              {/* Seção de duplicatas (se houver) */}
              {duplicateResults && getDuplicateStats(duplicateResults).duplicates > 0 && (
                <details className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <summary className="cursor-pointer font-medium text-orange-900 flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    Ver {getDuplicateStats(duplicateResults).duplicates} duplicatas ignoradas
                  </summary>
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {duplicateResults
                      .filter(r => r.isDuplicate)
                      .map((result, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-white border border-orange-300 rounded text-sm"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{result.transaction.description}</p>
                            <p className="text-xs text-gray-500">
                              📅 {new Date(result.transaction.date).toLocaleDateString('pt-BR')} •
                              {result.similarity}% similar
                            </p>
                          </div>
                          <div className="ml-4 text-right">
                            <p className="font-semibold text-gray-700">
                              {result.transaction.amount.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </details>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
                {preview.map((transaction, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 border rounded hover:bg-gray-50 transition-colors ${
                      selectedTransactions.has(idx) ? 'bg-blue-50 border-blue-300' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={selectedTransactions.has(idx)}
                      onCheckedChange={() => handleToggleTransaction(idx)}
                      className="mt-1"
                    />

                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={transaction.type === 'entrada' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {transaction.type === 'entrada' ? 'Entrada' : 'Saída'}
                          </Badge>
                          {transaction.transactionType && (
                            <Badge variant="outline" className="text-xs">
                              {transaction.transactionType}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm truncate">{transaction.description}</p>
                        <p className="text-xs text-gray-500">📅 {new Date(transaction.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="ml-4 text-right">
                        <p className={`font-bold ${transaction.type === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'entrada' ? '+' : '-'} {transaction.amount.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreview(null);
                    setFile(null);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isImporting || selectedTransactions.size === 0}
                  className="flex-1"
                >
                  {isImporting
                    ? "Importando..."
                    : selectedTransactions.size === 0
                      ? "Selecione ao menos 1"
                      : `Importar ${selectedTransactions.size} ${selectedTransactions.size === 1 ? 'lançamento' : 'lançamentos'}`
                  }
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFImportModal;
