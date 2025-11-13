/**
 * Serviço de banco de dados SQLite local
 * Usa sql.js para rodar SQLite no browser
 */

import initSqlJs, { Database } from 'sql.js';

let db: Database | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Inicializa o banco de dados
 */
export async function initDatabase(): Promise<void> {
  if (db) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`
    });

    // Tentar carregar banco existente do localStorage
    const savedDb = localStorage.getItem('dre-database');
    if (savedDb) {
      // Converter base64 para Uint8Array
      const binaryString = atob(savedDb);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      db = new SQL.Database(bytes);
      console.log('✅ Banco carregado do localStorage');
    } else {
      db = new SQL.Database();
      await createSchema();
      console.log('✅ Novo banco criado');
    }
  })();

  return initPromise;
}

/**
 * Cria o schema do banco
 */
async function createSchema(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  db.run(`
    CREATE TABLE IF NOT EXISTS financial_items (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('entrada', 'saida')),
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      bank TEXT,
      business_unit_id TEXT,
      is_installment INTEGER DEFAULT 0,
      total_installments INTEGER,
      installment_number INTEGER,
      installment_group_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS recurring_bills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      value REAL NOT NULL,
      due_date INTEGER NOT NULL,
      category TEXT,
      bank TEXT,
      is_installment INTEGER DEFAULT 0,
      total_installments INTEGER,
      current_installment INTEGER DEFAULT 1,
      start_month TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Migração: adicionar colunas se não existirem
  try {
    db.run(`ALTER TABLE recurring_bills ADD COLUMN is_installment INTEGER DEFAULT 0`);
  } catch (e) { /* Coluna já existe */ }
  try {
    db.run(`ALTER TABLE recurring_bills ADD COLUMN total_installments INTEGER`);
  } catch (e) { /* Coluna já existe */ }
  try {
    db.run(`ALTER TABLE recurring_bills ADD COLUMN current_installment INTEGER DEFAULT 1`);
  } catch (e) { /* Coluna já existe */ }
  try {
    db.run(`ALTER TABLE recurring_bills ADD COLUMN start_month TEXT`);
  } catch (e) { /* Coluna já existe */ }

  db.run(`
    CREATE TABLE IF NOT EXISTS recurring_bills_instances (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL,
      month_reference TEXT NOT NULL,
      adjusted_value REAL,
      is_paid INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (bill_id) REFERENCES recurring_bills(id) ON DELETE CASCADE,
      UNIQUE(bill_id, month_reference)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS business_units (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS unit_categories (
      id TEXT PRIMARY KEY,
      business_unit_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('entrada', 'saida')),
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (business_unit_id) REFERENCES business_units(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bank_balances (
      id TEXT PRIMARY KEY,
      bank_name TEXT NOT NULL,
      initial_balance REAL DEFAULT 0,
      baseline_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Índices para performance
  db.run('CREATE INDEX IF NOT EXISTS idx_financial_items_date ON financial_items(date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_financial_items_unit ON financial_items(business_unit_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_unit_categories_unit ON unit_categories(business_unit_id)');

  saveDatabase();
}

/**
 * Salva o banco no localStorage
 */
export function saveDatabase(): void {
  if (!db) return;
  const data = db.export();

  // Converter Uint8Array para base64 (sem usar Buffer)
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  const base64 = btoa(binary);

  localStorage.setItem('dre-database', base64);
}

/**
 * Executa uma query SELECT
 */
export function query<T = any>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const results = db.exec(sql, params);
  if (results.length === 0) return [];

  const { columns, values } = results[0];
  return values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

/**
 * Executa uma query INSERT/UPDATE/DELETE
 */
export function execute(sql: string, params: any[] = []): void {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  saveDatabase();
}

/**
 * Gera um UUID simples
 */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Data atual em ISO format
 */
export function now(): string {
  return new Date().toISOString();
}
