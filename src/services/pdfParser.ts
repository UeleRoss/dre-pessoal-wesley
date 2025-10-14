import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker do PDF.js para usar a versão local do node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface ParsedTransaction {
  date: string; // YYYY-MM-DD
  type: 'entrada' | 'saida';
  amount: number;
  description: string;
  transactionType?: string; // ex: "Saída PIX", "Entrada PIX", etc.
}

export interface ParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  errors: string[];
  bankName?: string;
  needsPassword?: boolean;
}

/**
 * Extrai texto de um arquivo PDF
 * @param file Arquivo PDF
 * @param password Senha do PDF (opcional)
 */
async function extractTextFromPDF(file: File, password?: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    password: password || undefined,
  });

  const pdf = await loadingTask.promise;

  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

/**
 * Identifica o banco pelo texto do PDF
 */
function identifyBank(text: string): string | null {
  const bankPatterns = [
    { pattern: /C6\s*BANK/i, name: 'C6 Bank' },
    { pattern: /Nubank/i, name: 'Nubank' },
    { pattern: /Banco\s+do\s+Brasil/i, name: 'Banco do Brasil' },
    { pattern: /Itaú/i, name: 'Itaú' },
    { pattern: /Bradesco/i, name: 'Bradesco' },
    { pattern: /Santander/i, name: 'Santander' },
  ];

  for (const { pattern, name } of bankPatterns) {
    if (pattern.test(text)) {
      return name;
    }
  }

  return null;
}

/**
 * Converte string de data para formato YYYY-MM-DD
 * Suporta formatos: DD/MM/YYYY, DD/MM
 */
function parseDate(dateStr: string, referenceYear?: number): string | null {
  // Remove espaços extras
  dateStr = dateStr.trim();

  // Formato DD/MM/YYYY
  const fullDateMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fullDateMatch) {
    const [, day, month, year] = fullDateMatch;
    return `${year}-${month}-${day}`;
  }

  // Formato DD/MM (sem ano)
  const shortDateMatch = dateStr.match(/^(\d{2})\/(\d{2})$/);
  if (shortDateMatch && referenceYear) {
    const [, day, month] = shortDateMatch;
    return `${referenceYear}-${month}-${day}`;
  }

  return null;
}

/**
 * Converte string de valor monetário para número
 * Suporta formatos: R$ 1.234,56 | -R$ 1.234,56 | 1.234,56
 */
function parseAmount(amountStr: string): number | null {
  // Remove "R$" e espaços
  let cleaned = amountStr.replace(/R\$\s*/g, '').trim();

  // Detecta se é negativo
  const isNegative = cleaned.startsWith('-');
  cleaned = cleaned.replace(/^-/, '');

  // Remove pontos (separador de milhar) e substitui vírgula por ponto
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');

  const value = parseFloat(cleaned);

  if (isNaN(value)) {
    return null;
  }

  return isNegative ? -value : value;
}

/**
 * Parser específico para C6 Bank
 * Baseado no formato do extrato fornecido
 */
function parseC6BankExtract(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  // Regex para capturar linhas de transação
  // Formato: DD/MM DD/MM Tipo Descrição ±R$ valor
  const transactionPattern = /(\d{2}\/\d{2})\s+(\d{2}\/\d{2})\s+(Saída PIX|Entrada PIX|Débito de Cartão|Pagamento|Entradas)\s+(.+?)\s+(-?R\$\s*[\d.,]+)/gi;

  // Tentar extrair ano do cabeçalho (ex: "Setembro 2025")
  const yearMatch = text.match(/\b(202[0-9])\b/);
  const referenceYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

  let match;
  while ((match = transactionPattern.exec(text)) !== null) {
    const [, launchDate, , transactionType, description, amountStr] = match;

    const date = parseDate(launchDate, referenceYear);
    const amount = parseAmount(amountStr);

    if (!date || amount === null) {
      continue;
    }

    // Determinar tipo (entrada ou saída)
    const type: 'entrada' | 'saida' =
      transactionType.toLowerCase().includes('entrada') || amount > 0
        ? 'entrada'
        : 'saida';

    transactions.push({
      date,
      type,
      amount: Math.abs(amount),
      description: description.trim(),
      transactionType,
    });
  }

  return transactions;
}

/**
 * Parser genérico - tenta identificar padrões comuns
 */
function parseGenericExtract(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  // Regex mais flexível para capturar transações
  const patterns = [
    // Formato: data descrição valor
    /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?R?\$?\s*[\d.,]+)$/,
    // Formato: data data descrição valor
    /(\d{2}\/\d{2})\s+\d{2}\/\d{2}\s+(.+?)\s+(-?R?\$?\s*[\d.,]+)$/,
  ];

  const referenceYear = new Date().getFullYear();

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const [, dateStr, description, amountStr] = match;

        const date = parseDate(dateStr, referenceYear);
        const amount = parseAmount(amountStr);

        if (date && amount !== null) {
          const type: 'entrada' | 'saida' = amount >= 0 ? 'entrada' : 'saida';

          transactions.push({
            date,
            type,
            amount: Math.abs(amount),
            description: description.trim(),
          });
        }
        break;
      }
    }
  }

  return transactions;
}

/**
 * Função principal: parse de PDF bancário
 * @param file Arquivo PDF
 * @param password Senha do PDF (opcional)
 */
export async function parseBankStatementPDF(file: File, password?: string): Promise<ParseResult> {
  const errors: string[] = [];

  try {
    // 1. Extrair texto do PDF
    const text = await extractTextFromPDF(file, password);

    if (!text || text.length < 50) {
      return {
        success: false,
        transactions: [],
        errors: ['PDF vazio ou não foi possível extrair texto'],
      };
    }

    // 2. Identificar banco
    const bankName = identifyBank(text);

    // 3. Parse específico por banco
    let transactions: ParsedTransaction[] = [];

    if (bankName === 'C6 Bank') {
      transactions = parseC6BankExtract(text);
    } else {
      // Parser genérico para bancos não suportados
      transactions = parseGenericExtract(text);
      if (transactions.length === 0) {
        errors.push('Formato de extrato não reconhecido. Adicione suporte para este banco.');
      }
    }

    // 4. Validar transações
    if (transactions.length === 0) {
      return {
        success: false,
        transactions: [],
        errors: ['Nenhuma transação encontrada no PDF'],
        bankName: bankName || 'Desconhecido',
      };
    }

    return {
      success: true,
      transactions,
      errors,
      bankName: bankName || 'Desconhecido',
    };

  } catch (error: any) {
    console.error('Erro ao processar PDF:', error);

    // Verificar se o erro é relacionado à senha
    if (error?.name === 'PasswordException' || error?.message?.includes('password')) {
      return {
        success: false,
        transactions: [],
        errors: password
          ? ['Senha incorreta. Tente novamente.']
          : ['Este PDF está protegido com senha.'],
        needsPassword: true,
      };
    }

    return {
      success: false,
      transactions: [],
      errors: [
        error instanceof Error
          ? `Erro ao processar PDF: ${error.message}`
          : 'Erro desconhecido ao processar PDF'
      ],
    };
  }
}
