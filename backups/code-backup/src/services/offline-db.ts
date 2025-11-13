import type { BusinessUnit } from "@/types/business-unit";
import type { FinancialItem, UnitCategory } from "@/types/financial";
import type { BankBalance, Category, RecurringBill, RecurringBillInstance } from "@/types/database";
import { generateId } from "@/utils/id";
import { localDb, type Statement } from "./local-db";

type FinancialItemPayload = {
  id?: string;
  date: string;
  type: string;
  description: string;
  amount: number;
  category: string | null;
  bank: string | null;
  source?: string | null;
  business_unit_id: string | null;
  is_recurring?: boolean;
  is_installment?: boolean;
  total_installments?: number | null;
  installment_start_month?: string | null;
  installment_end_month?: string | null;
  credit_card?: string | null;
  recurring_template_id?: string | null;
  recurring_status?: string | null;
  installment_group_id?: string | null;
  installment_number?: number | null;
};

type RecurringBillPayload = {
  name: string;
  value: number;
  due_date: number;
  category: string | null;
  bank: string | null;
};

const now = () => new Date().toISOString();

const toBool = (value: unknown) => value === true || value === 1 || value === "1";

type FinancialItemRow = Omit<FinancialItem, "is_installment" | "is_recurring"> & {
  is_installment: number;
  is_recurring: number;
};

type RecurringBillInstanceRow = Omit<RecurringBillInstance, "pago"> & {
  pago: number;
};

const mapFinancialItem = (row: FinancialItemRow): FinancialItem => ({
  ...row,
  is_installment: toBool(row.is_installment),
  is_recurring: toBool(row.is_recurring),
});

const mapInstance = (row: RecurringBillInstanceRow): RecurringBillInstance => ({
  ...row,
  pago: toBool(row.pago),
});

const ensureId = (id?: string) => id || generateId();

const timestamped = () => ({
  created_at: now(),
  updated_at: now(),
});

const boolToInt = (value: boolean | undefined | null) => (value ? 1 : 0);

export const offlineDb = {
  async fetchFinancialItems(userId: string, start: string, end: string): Promise<FinancialItem[]> {
    const rows = await localDb.select<FinancialItemRow>(
      `SELECT * FROM financial_items
       WHERE user_id = ?
         AND date >= ?
         AND date <= ?
       ORDER BY date DESC`,
      [userId, start, end]
    );
    return rows.map(mapFinancialItem);
  },

  async fetchCategories(userId: string): Promise<Category[]> {
    return localDb.select<Category>(
      `SELECT id, name, user_id, created_at, updated_at
       FROM categories
       WHERE user_id = ?
       ORDER BY name COLLATE NOCASE`,
      [userId]
    );
  },

  async fetchBusinessUnits(userId: string): Promise<Pick<BusinessUnit, "id" | "name">[]> {
    return localDb.select<Pick<BusinessUnit, "id" | "name">>(
      `SELECT id, name
       FROM business_units
       WHERE user_id = ?
       ORDER BY name COLLATE NOCASE`,
      [userId]
    );
  },

  async fetchUnitCategories(userId: string): Promise<UnitCategory[]> {
    return localDb.select<UnitCategory>(
      `SELECT id, name, type, business_unit_id, user_id, created_at, updated_at
       FROM unit_categories
       WHERE user_id = ?`,
      [userId]
    );
  },

  async fetchBankBalances(userId: string): Promise<Pick<BankBalance, "id" | "bank_name">[]> {
    return localDb.select<Pick<BankBalance, "id" | "bank_name">>(
      `SELECT id, bank_name
       FROM bank_balances
       WHERE user_id = ?
       ORDER BY bank_name COLLATE NOCASE`,
      [userId]
    );
  },

  async ensureBusinessUnit(userId: string, payload: { name: string; color: string; icon: string }) {
    const stamp = timestamped();
    await localDb.run(
      `INSERT OR IGNORE INTO business_units (id, user_id, name, color, icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [generateId(), userId, payload.name, payload.color, payload.icon, stamp.created_at, stamp.updated_at]
    );
  },

  async insertFinancialItems(userId: string, items: FinancialItemPayload[]) {
    const stamp = timestamped();
    const statements: Statement[] = items.map((item) => ({
      sql: `INSERT INTO financial_items (
              id, user_id, date, type, description, amount, category, bank, source,
              business_unit_id, is_recurring, is_installment, total_installments,
              installment_start_month, installment_end_month, credit_card,
              recurring_template_id, recurring_status, installment_group_id, installment_number,
              created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        ensureId(item.id),
        userId,
        item.date,
        item.type,
        item.description,
        item.amount,
        item.category,
        item.bank,
        item.source ?? null,
        item.business_unit_id,
        boolToInt(item.is_recurring),
        boolToInt(item.is_installment),
        item.total_installments ?? null,
        item.installment_start_month ?? null,
        item.installment_end_month ?? null,
        item.credit_card ?? null,
        item.recurring_template_id ?? null,
        item.recurring_status ?? null,
        item.installment_group_id ?? null,
        item.installment_number ?? null,
        stamp.created_at,
        stamp.updated_at,
      ],
    }));

    await localDb.transaction(statements);
  },

  async updateFinancialItem(userId: string, id: string, payload: FinancialItemPayload) {
    const stamp = now();
    await localDb.run(
      `UPDATE financial_items
       SET date = ?,
           type = ?,
           description = ?,
           amount = ?,
           category = ?,
           bank = ?,
           source = ?,
           business_unit_id = ?,
           is_recurring = ?,
           is_installment = ?,
           total_installments = ?,
           installment_start_month = ?,
           installment_end_month = ?,
           updated_at = ?
       WHERE id = ?
         AND user_id = ?`,
      [
        payload.date,
        payload.type,
        payload.description,
        payload.amount,
        payload.category,
        payload.bank,
        payload.source ?? null,
        payload.business_unit_id,
        boolToInt(payload.is_recurring),
        boolToInt(payload.is_installment),
        payload.total_installments ?? null,
        payload.installment_start_month ?? null,
        payload.installment_end_month ?? null,
        stamp,
        id,
        userId,
      ]
    );
  },

  async deleteFinancialItem(userId: string, id: string) {
    await localDb.run(`DELETE FROM financial_items WHERE id = ? AND user_id = ?`, [id, userId]);
  },

  async fetchRecurringBills(userId: string): Promise<RecurringBill[]> {
    return localDb.select<RecurringBill>(
      `SELECT *
       FROM recurring_bills
       WHERE user_id = ?
       ORDER BY due_date ASC`,
      [userId]
    );
  },

  async fetchRecurringBillInstances(userId: string, month: string): Promise<RecurringBillInstance[]> {
    const rows = await localDb.select<RecurringBillInstanceRow>(
      `SELECT *
       FROM recurring_bills_instances
       WHERE user_id = ?
         AND month_reference = ?`,
      [userId, month]
    );
    return rows.map(mapInstance);
  },

  async insertRecurringBill(userId: string, payload: RecurringBillPayload) {
    const stamp = timestamped();
    await localDb.run(
      `INSERT INTO recurring_bills (id, user_id, name, value, due_date, category, bank, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId(),
        userId,
        payload.name,
        payload.value,
        payload.due_date,
        payload.category,
        payload.bank,
        stamp.created_at,
        stamp.updated_at,
      ]
    );
  },

  async updateRecurringBill(userId: string, id: string, payload: RecurringBillPayload) {
    await localDb.run(
      `UPDATE recurring_bills
       SET name = ?,
           value = ?,
           due_date = ?,
           category = ?,
           bank = ?,
           updated_at = ?
       WHERE id = ?
         AND user_id = ?`,
      [payload.name, payload.value, payload.due_date, payload.category, payload.bank, now(), id, userId]
    );
  },

  async deleteRecurringBill(userId: string, id: string) {
    await localDb.transaction([
      {
        sql: `DELETE FROM recurring_bills_instances WHERE bill_id = ? AND user_id = ?`,
        params: [id, userId],
      },
      {
        sql: `DELETE FROM recurring_bills WHERE id = ? AND user_id = ?`,
        params: [id, userId],
      },
    ]);
  },

  async upsertRecurringBillInstance(
    userId: string,
    billId: string,
    monthReference: string,
    updates: { pago?: boolean; valor_ajustado?: number | null }
  ) {
    const stamp = timestamped();
    const pagoValue = updates.pago;
    const valor = typeof updates.valor_ajustado === "number" ? updates.valor_ajustado : null;

    const statements: Statement[] = [
      {
        sql: `INSERT INTO recurring_bills_instances (
                id, user_id, bill_id, month_reference, pago, valor_ajustado, created_at, updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(user_id, bill_id, month_reference) DO UPDATE SET
                pago = CASE
                  WHEN excluded.pago IS NULL THEN recurring_bills_instances.pago
                  ELSE excluded.pago
                END,
                valor_ajustado = CASE
                  WHEN excluded.valor_ajustado IS NULL THEN recurring_bills_instances.valor_ajustado
                  ELSE excluded.valor_ajustado
                END,
                updated_at = excluded.updated_at`,
        params: [
          generateId(),
          userId,
          billId,
          monthReference,
          typeof pagoValue === "boolean" ? boolToInt(pagoValue) : null,
          valor,
          stamp.created_at,
          stamp.updated_at,
        ],
      },
    ];

    await localDb.transaction(statements);
  },
};
