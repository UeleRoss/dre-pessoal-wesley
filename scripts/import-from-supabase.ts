/**
 * Importação DIRETA: Supabase → SQLite
 * Pega dados via API e importa no banco local
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Tabelas em ordem de importação (por causa de foreign keys)
const TABLES = [
  'user_profiles',
  'business_units',
  'categories',
  'unit_categories',
  'bank_balances',
  'financial_items',
  'recurring_bills',
  'recurring_bills_instances'
];

async function importFromSupabase() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 IMPORTAÇÃO DIRETA: Supabase → SQLite');
  console.log('═══════════════════════════════════════════════════════\n');

  // Preparar banco
  const dbDir = join(homedir(), 'Library', 'Application Support', 'dre-pessoal', 'dre');
  mkdirSync(dbDir, { recursive: true });
  const dbPath = join(dbDir, 'dre.db');

  console.log(`📂 Banco: ${dbPath}\n`);

  // Criar banco com schema
  const db = new Database(dbPath);

  console.log('📄 Criando schema...');
  const schema = readFileSync('localdb/schema.sql', 'utf-8');
  db.exec(schema);
  console.log('✅ Schema criado\n');

  let totalRecords = 0;

  for (const table of TABLES) {
    console.log(`📦 Importando ${table}...`);

    // Buscar dados do Supabase
    const { data, error } = await supabase
      .from(table)
      .select('*');

    if (error) {
      console.error(`❌ Erro em ${table}:`, error.message);
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`   ⚠️  Vazio (0 registros)\n`);
      continue;
    }

    // Importar para SQLite
    const columns = Object.keys(data[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
    );

    const insertMany = db.transaction((records: any[]) => {
      for (const record of records) {
        const values = columns.map(col => record[col]);
        stmt.run(...values);
      }
    });

    try {
      insertMany(data);
      totalRecords += data.length;
      console.log(`   ✅ ${data.length} registros importados\n`);
    } catch (err: any) {
      console.error(`   ❌ Erro ao importar: ${err.message}\n`);
    }
  }

  db.close();

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ IMPORTAÇÃO COMPLETA!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📊 Total: ${totalRecords} registros`);
  console.log(`📂 Banco: ${dbPath}`);
  console.log('\n🎮 Agora rode: npm run electron:dev\n');
}

importFromSupabase().catch(console.error);
