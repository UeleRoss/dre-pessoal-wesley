PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('db_version', '1');

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  onboarding_completed INTEGER DEFAULT 1,
  theme_color TEXT DEFAULT '#2563eb',
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO user_profiles (
  id, user_id, display_name, onboarding_completed, theme_color, avatar_url, created_at, updated_at
) VALUES (
  'local-profile', 'local-user', 'Usuário Offline', 1, '#2563eb', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, name COLLATE NOCASE)
);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

CREATE TABLE IF NOT EXISTS business_units (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, name COLLATE NOCASE)
);
CREATE INDEX IF NOT EXISTS idx_business_units_user ON business_units(user_id);

CREATE TABLE IF NOT EXISTS unit_categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  business_unit_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_unit_categories_user ON unit_categories(user_id);

CREATE TABLE IF NOT EXISTS bank_balances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  baseline_date TEXT,
  initial_balance REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bank_balances_user ON bank_balances(user_id);

CREATE TABLE IF NOT EXISTS financial_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT,
  bank TEXT,
  source TEXT,
  business_unit_id TEXT,
  is_recurring INTEGER DEFAULT 0,
  is_installment INTEGER DEFAULT 0,
  total_installments INTEGER,
  installment_start_month TEXT,
  installment_end_month TEXT,
  credit_card TEXT,
  recurring_template_id TEXT,
  recurring_status TEXT,
  installment_group_id TEXT,
  installment_number INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_financial_items_user ON financial_items(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_items_date ON financial_items(user_id, date);

CREATE TABLE IF NOT EXISTS recurring_bills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  value REAL NOT NULL,
  due_date INTEGER NOT NULL,
  category TEXT,
  bank TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recurring_bills_user ON recurring_bills(user_id);

CREATE TABLE IF NOT EXISTS recurring_bills_instances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  month_reference TEXT NOT NULL,
  valor_ajustado REAL,
  pago INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, bill_id, month_reference)
);
CREATE INDEX IF NOT EXISTS idx_recurring_instances_user ON recurring_bills_instances(user_id, month_reference);
