/**
 * Utilidades para cálculo de faturas de cartão de crédito
 */

/**
 * Calcula o mês de referência da fatura baseado na data da compra e dia de fechamento
 *
 * Regra: Se a compra foi feita APÓS o dia de fechamento, ela vai para a fatura do PRÓXIMO mês
 * Se a compra foi feita ATÉ o dia de fechamento, ela vai para a fatura do MÊS ATUAL
 *
 * Exemplos:
 * - Compra em 05/Out, Fechamento dia 7 → Fatura de Outubro (paga em Nov)
 * - Compra em 10/Out, Fechamento dia 7 → Fatura de Novembro (paga em Dez)
 * - Compra em 31/Out, Fechamento dia 15 → Fatura de Novembro (paga em Dez)
 *
 * @param purchaseDate - Data da compra (formato: YYYY-MM-DD ou Date)
 * @param closingDay - Dia de fechamento da fatura (1-31)
 * @returns Data de referência da fatura no formato YYYY-MM-DD (sempre dia 01)
 */
export function calculateInvoiceReferenceMonth(
  purchaseDate: string | Date,
  closingDay: number
): string {
  const purchase = typeof purchaseDate === 'string'
    ? new Date(purchaseDate + 'T00:00:00')
    : purchaseDate;

  const purchaseDay = purchase.getDate();
  let referenceMonth = purchase.getMonth(); // 0-11
  let referenceYear = purchase.getFullYear();

  // Se a compra foi após o fechamento, vai para o próximo mês
  if (purchaseDay > closingDay) {
    referenceMonth += 1;

    // Se passou de dezembro (11), vai para janeiro do próximo ano
    if (referenceMonth > 11) {
      referenceMonth = 0;
      referenceYear += 1;
    }
  }

  // Retorna sempre o dia 01 do mês de referência
  const monthStr = String(referenceMonth + 1).padStart(2, '0');
  return `${referenceYear}-${monthStr}-01`;
}

/**
 * Calcula a data de vencimento da fatura
 *
 * @param referenceMonth - Mês de referência da fatura (YYYY-MM-DD)
 * @param dueDay - Dia de vencimento (1-31)
 * @returns Data de vencimento no formato YYYY-MM-DD
 */
export function calculateDueDate(
  referenceMonth: string,
  dueDay: number
): string {
  const [year, month] = referenceMonth.split('-').map(Number);

  // Vencimento é sempre no mês SEGUINTE ao de referência
  let dueMonth = month + 1;
  let dueYear = year;

  if (dueMonth > 12) {
    dueMonth = 1;
    dueYear += 1;
  }

  const monthStr = String(dueMonth).padStart(2, '0');
  const dayStr = String(dueDay).padStart(2, '0');

  return `${dueYear}-${monthStr}-${dayStr}`;
}

/**
 * Formata o nome do mês de referência para exibição
 *
 * @param referenceMonth - Mês de referência (YYYY-MM-DD)
 * @returns Nome do mês formatado (ex: "Outubro de 2025")
 */
export function formatInvoiceMonth(referenceMonth: string): string {
  const date = new Date(referenceMonth + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Retorna informações sobre quando a fatura será paga
 *
 * @param purchaseDate - Data da compra
 * @param closingDay - Dia de fechamento
 * @param dueDay - Dia de vencimento
 * @returns Objeto com informações da fatura
 */
export function getInvoiceInfo(
  purchaseDate: string | Date,
  closingDay: number,
  dueDay: number
) {
  const referenceMonth = calculateInvoiceReferenceMonth(purchaseDate, closingDay);
  const dueDate = calculateDueDate(referenceMonth, dueDay);
  const invoiceMonth = formatInvoiceMonth(referenceMonth);

  return {
    referenceMonth,      // YYYY-MM-01
    dueDate,            // YYYY-MM-DD (data de vencimento)
    invoiceMonth,       // "Outubro de 2025"
    dueDateFormatted: new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR')
  };
}

/**
 * Valida se um dia é válido para fechamento/vencimento
 *
 * @param day - Dia a ser validado
 * @returns true se o dia está entre 1 e 31
 */
export function isValidDay(day: number): boolean {
  return day >= 1 && day <= 31;
}
