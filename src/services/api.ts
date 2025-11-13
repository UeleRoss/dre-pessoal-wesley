/**
 * API para acessar o banco de dados SQLite
 * Todas as funções retornam Promises para compatibilidade com React Query
 */

import { query, execute, uuid, now } from './database';

// ============================================================================
// TYPES
// ============================================================================

export type FinancialItem = {
  id: string;
  date: string;
  type: 'entrada' | 'saida';
  description: string;
  amount: number;
  category?: string;
  bank?: string;
  business_unit_id?: string;
  is_installment: boolean;
  total_installments?: number;
  installment_number?: number;
  installment_group_id?: string;
  created_at: string;
  updated_at: string;
};

export type RecurringBill = {
  id: string;
  name: string;
  value: number;
  due_date: number;
  category?: string;
  bank?: string;
  is_installment: boolean;
  total_installments?: number;
  current_installment: number;
  start_month?: string;
  created_at: string;
  updated_at: string;
};

export type RecurringBillInstance = {
  id: string;
  bill_id: string;
  month_reference: string;
  adjusted_value?: number;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
};

export type BusinessUnit = {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  created_at: string;
};

export type UnitCategory = {
  id: string;
  business_unit_id: string;
  type: 'entrada' | 'saida';
  name: string;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  created_at: string;
};

// ============================================================================
// FINANCIAL ITEMS (Lançamentos)
// ============================================================================

export async function fetchFinancialItems(startDate: string, endDate: string): Promise<FinancialItem[]> {
  return query<FinancialItem>(
    `SELECT * FROM financial_items WHERE date >= ? AND date <= ? ORDER BY date DESC`,
    [startDate, endDate]
  );
}

export async function createFinancialItem(data: Omit<FinancialItem, 'id' | 'created_at' | 'updated_at'>): Promise<FinancialItem> {
  const id = uuid();
  const timestamp = now();

  execute(
    `INSERT INTO financial_items (
      id, date, type, description, amount, category, bank, business_unit_id,
      is_installment, total_installments, installment_number, installment_group_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.date,
      data.type,
      data.description,
      data.amount,
      data.category || null,
      data.bank || null,
      data.business_unit_id || null,
      data.is_installment ? 1 : 0,
      data.total_installments || null,
      data.installment_number || null,
      data.installment_group_id || null,
      timestamp,
      timestamp,
    ]
  );

  return {
    ...data,
    id,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export async function updateFinancialItem(id: string, data: Partial<FinancialItem>): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.date !== undefined) {
    fields.push('date = ?');
    values.push(data.date);
  }
  if (data.type !== undefined) {
    fields.push('type = ?');
    values.push(data.type);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.amount !== undefined) {
    fields.push('amount = ?');
    values.push(data.amount);
  }
  if (data.category !== undefined) {
    fields.push('category = ?');
    values.push(data.category || null);
  }
  if (data.bank !== undefined) {
    fields.push('bank = ?');
    values.push(data.bank || null);
  }
  if (data.business_unit_id !== undefined) {
    fields.push('business_unit_id = ?');
    values.push(data.business_unit_id || null);
  }

  fields.push('updated_at = ?');
  values.push(now());

  values.push(id);

  execute(`UPDATE financial_items SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteFinancialItem(id: string): Promise<void> {
  execute(`DELETE FROM financial_items WHERE id = ?`, [id]);
}

// ============================================================================
// RECURRING BILLS (Contas Recorrentes)
// ============================================================================

export async function fetchRecurringBills(): Promise<RecurringBill[]> {
  return query<RecurringBill>(`SELECT * FROM recurring_bills ORDER BY name ASC`);
}

export async function createRecurringBill(data: Omit<RecurringBill, 'id' | 'created_at' | 'updated_at'>): Promise<RecurringBill> {
  const id = uuid();
  const timestamp = now();

  execute(
    `INSERT INTO recurring_bills (id, name, value, due_date, category, bank, is_installment, total_installments, current_installment, start_month, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.value,
      data.due_date,
      data.category || null,
      data.bank || null,
      data.is_installment ? 1 : 0,
      data.total_installments || null,
      data.current_installment || 1,
      data.start_month || null,
      timestamp,
      timestamp
    ]
  );

  return {
    ...data,
    id,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export async function updateRecurringBill(id: string, data: Partial<RecurringBill>): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.value !== undefined) {
    fields.push('value = ?');
    values.push(data.value);
  }
  if (data.due_date !== undefined) {
    fields.push('due_date = ?');
    values.push(data.due_date);
  }
  if (data.category !== undefined) {
    fields.push('category = ?');
    values.push(data.category || null);
  }
  if (data.bank !== undefined) {
    fields.push('bank = ?');
    values.push(data.bank || null);
  }
  if (data.is_installment !== undefined) {
    fields.push('is_installment = ?');
    values.push(data.is_installment ? 1 : 0);
  }
  if (data.total_installments !== undefined) {
    fields.push('total_installments = ?');
    values.push(data.total_installments || null);
  }
  if (data.current_installment !== undefined) {
    fields.push('current_installment = ?');
    values.push(data.current_installment);
  }
  if (data.start_month !== undefined) {
    fields.push('start_month = ?');
    values.push(data.start_month || null);
  }

  fields.push('updated_at = ?');
  values.push(now());

  values.push(id);

  execute(`UPDATE recurring_bills SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteRecurringBill(id: string): Promise<void> {
  execute(`DELETE FROM recurring_bills WHERE id = ?`, [id]);
}

// ============================================================================
// RECURRING BILL INSTANCES (Instâncias das contas por mês)
// ============================================================================

export async function fetchRecurringBillInstances(monthReference: string): Promise<RecurringBillInstance[]> {
  return query<RecurringBillInstance>(
    `SELECT * FROM recurring_bills_instances WHERE month_reference = ?`,
    [monthReference]
  );
}

export async function upsertRecurringBillInstance(
  billId: string,
  monthReference: string,
  adjustedValue?: number,
  isPaid?: boolean
): Promise<void> {
  const existing = query<RecurringBillInstance>(
    `SELECT * FROM recurring_bills_instances WHERE bill_id = ? AND month_reference = ?`,
    [billId, monthReference]
  );

  if (existing.length > 0) {
    const fields: string[] = [];
    const values: any[] = [];

    if (adjustedValue !== undefined) {
      fields.push('adjusted_value = ?');
      values.push(adjustedValue);
    }
    if (isPaid !== undefined) {
      fields.push('is_paid = ?');
      values.push(isPaid ? 1 : 0);
    }

    fields.push('updated_at = ?');
    values.push(now());

    values.push(billId, monthReference);

    execute(
      `UPDATE recurring_bills_instances SET ${fields.join(', ')} WHERE bill_id = ? AND month_reference = ?`,
      values
    );
  } else {
    execute(
      `INSERT INTO recurring_bills_instances (id, bill_id, month_reference, adjusted_value, is_paid, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), billId, monthReference, adjustedValue || null, isPaid ? 1 : 0, now(), now()]
    );
  }
}

// ============================================================================
// BUSINESS UNITS & CATEGORIES
// ============================================================================

export async function fetchBusinessUnits(): Promise<BusinessUnit[]> {
  return query<BusinessUnit>(`SELECT * FROM business_units ORDER BY name ASC`);
}

export async function fetchUnitCategories(businessUnitId?: string): Promise<UnitCategory[]> {
  if (businessUnitId) {
    return query<UnitCategory>(
      `SELECT * FROM unit_categories WHERE business_unit_id = ? ORDER BY name ASC`,
      [businessUnitId]
    );
  }
  return query<UnitCategory>(`SELECT * FROM unit_categories ORDER BY name ASC`);
}

export async function fetchCategories(): Promise<Category[]> {
  return query<Category>(`SELECT * FROM categories ORDER BY name ASC`);
}

// ============================================================================
// STATS & SUMMARIES
// ============================================================================

export async function fetchMonthSummary(year: number, month: number): Promise<{ entradas: number; saidas: number; saldo: number }> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const items = await fetchFinancialItems(startDate, endDate);

  const entradas = items.filter(i => i.type === 'entrada').reduce((sum, i) => sum + i.amount, 0);
  const saidas = items.filter(i => i.type === 'saida').reduce((sum, i) => sum + i.amount, 0);

  return {
    entradas,
    saidas,
    saldo: entradas - saidas,
  };
}
