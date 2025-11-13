/**
 * Script para descobrir quais tabelas existem no Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function discoverTables() {
  console.log('🔍 Procurando tabelas no Supabase...\n');

  // Tentar diferentes nomes de tabelas comuns
  const possibleTables = [
    'financial_items',
    'categories',
    'categorias',
    'business_units',
    'unidades',
    'unit_categories',
    'bank_balances',
    'recurring_bills',
    'recurring_bills_instances',
    'user_profiles',
    'profiles',
    'contas',
    'lancamentos',
    'users'
  ];

  const foundTables: string[] = [];

  for (const table of possibleTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`✅ ${table} - ${count || 0} registros`);
        foundTables.push(table);
      }
    } catch (e) {
      // Ignore
    }
  }

  console.log(`\n📊 Total de tabelas encontradas: ${foundTables.length}`);
  console.log('Tabelas:', foundTables);

  return foundTables;
}

discoverTables().catch(console.error);
