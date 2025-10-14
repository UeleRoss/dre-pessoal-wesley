import { supabase } from "@/integrations/supabase/client";
import { ParsedTransaction } from "./pdfParser";

export interface DuplicateCheckResult {
  transaction: ParsedTransaction;
  isDuplicate: boolean;
  existingItemId?: string;
  similarity: number; // 0-100
}

/**
 * Normaliza uma string para comparação
 * Remove acentos, pontuação e converte para minúsculas
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, '') // Remove pontuação
    .trim();
}

/**
 * Calcula similaridade entre duas strings (0-100)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);

  if (s1 === s2) return 100;

  // Levenshtein distance simplificado
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 100;

  const editDistance = levenshteinDistance(longer, shorter);
  const similarity = ((longer.length - editDistance) / longer.length) * 100;

  return Math.round(similarity);
}

/**
 * Calcula distância de Levenshtein entre duas strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Verifica se uma transação já existe no banco de dados
 * Critérios: mesma data, valor e descrição similar (>80%)
 */
export async function checkForDuplicates(
  transactions: ParsedTransaction[],
  userId: string
): Promise<DuplicateCheckResult[]> {
  try {
    // Buscar todas as transações do usuário dos últimos 90 dias
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: existingItems, error } = await supabase
      .from('financial_items')
      .select('id, date, amount, description, type')
      .eq('user_id', userId)
      .gte('date', ninetyDaysAgo.toISOString().split('T')[0]);

    if (error) {
      console.error('Erro ao buscar lançamentos existentes:', error);
      // Retorna sem marcar duplicatas em caso de erro
      return transactions.map(t => ({
        transaction: t,
        isDuplicate: false,
        similarity: 0,
      }));
    }

    const results: DuplicateCheckResult[] = [];

    for (const transaction of transactions) {
      let isDuplicate = false;
      let existingItemId: string | undefined;
      let maxSimilarity = 0;

      // Verificar cada item existente
      for (const existingItem of existingItems || []) {
        // 1. Verificar se a data é exatamente a mesma
        if (existingItem.date !== transaction.date) continue;

        // 2. Verificar se o valor é exatamente o mesmo
        const existingAmount = Math.abs(existingItem.amount);
        const transactionAmount = Math.abs(transaction.amount);
        if (Math.abs(existingAmount - transactionAmount) > 0.01) continue;

        // 3. Verificar se o tipo é o mesmo
        if (existingItem.type !== transaction.type) continue;

        // 4. Calcular similaridade da descrição
        const similarity = calculateStringSimilarity(
          existingItem.description,
          transaction.description
        );

        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
        }

        // Se similaridade >= 80%, considerar como duplicata
        if (similarity >= 80) {
          isDuplicate = true;
          existingItemId = existingItem.id;
          break;
        }
      }

      results.push({
        transaction,
        isDuplicate,
        existingItemId,
        similarity: maxSimilarity,
      });
    }

    return results;

  } catch (error) {
    console.error('Erro ao verificar duplicatas:', error);
    // Retorna sem marcar duplicatas em caso de erro
    return transactions.map(t => ({
      transaction: t,
      isDuplicate: false,
      similarity: 0,
    }));
  }
}

/**
 * Filtra apenas transações não duplicadas
 */
export function filterNonDuplicates(results: DuplicateCheckResult[]): ParsedTransaction[] {
  return results
    .filter(result => !result.isDuplicate)
    .map(result => result.transaction);
}

/**
 * Retorna estatísticas sobre duplicatas
 */
export function getDuplicateStats(results: DuplicateCheckResult[]): {
  total: number;
  duplicates: number;
  unique: number;
  percentage: number;
} {
  const total = results.length;
  const duplicates = results.filter(r => r.isDuplicate).length;
  const unique = total - duplicates;
  const percentage = total > 0 ? Math.round((duplicates / total) * 100) : 0;

  return { total, duplicates, unique, percentage };
}
