/**
 * BACKUP COMPLETO DO SUPABASE
 * Baixa TODOS os dados de TODAS as tabelas
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// TODAS as tabelas do seu DRE
const TABLES = [
  'financial_items',
  'categories',
  'business_units',
  'unit_categories',
  'bank_balances',
  'recurring_bills',
  'recurring_bills_instances',
  'user_profiles'
];

async function fullBackup() {
  console.log('🚀 BACKUP COMPLETO DO SUPABASE\n');
  console.log(`📅 ${new Date().toLocaleString('pt-BR')}\n`);

  const backupDir = join(process.cwd(), 'supabase-backup');
  mkdirSync(backupDir, { recursive: true });

  let totalRecords = 0;
  const backupData: any = {};

  for (const table of TABLES) {
    console.log(`📦 Baixando ${table}...`);

    const { data, error } = await supabase
      .from(table)
      .select('*');

    if (error) {
      console.error(`❌ Erro em ${table}:`, error.message);
      backupData[table] = [];
      continue;
    }

    const count = data?.length || 0;
    console.log(`✅ ${table}: ${count} registros\n`);

    backupData[table] = data || [];
    totalRecords += count;

    // Salvar individualmente também
    writeFileSync(
      join(backupDir, `${table}.json`),
      JSON.stringify(data, null, 2)
    );
  }

  // Salvar tudo em um único arquivo
  writeFileSync(
    join(backupDir, 'backup-completo.json'),
    JSON.stringify(backupData, null, 2)
  );

  console.log('═══════════════════════════════════');
  console.log(`✅ BACKUP COMPLETO!`);
  console.log(`📊 Total: ${totalRecords} registros`);
  console.log(`📂 Pasta: ${backupDir}`);
  console.log('═══════════════════════════════════\n');

  if (totalRecords === 0) {
    console.log('⚠️  ATENÇÃO: Nenhum dado foi encontrado no Supabase!');
    console.log('   Suas tabelas estão vazias ou você já migrou tudo.\n');
  }
}

fullBackup().catch(console.error);
