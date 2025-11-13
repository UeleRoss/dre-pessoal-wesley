/**
 * Script de backup do Supabase
 * Exporta todas as tabelas para CSV e JSON
 *
 * Como usar:
 * 1. npm install tsx
 * 2. npx tsx scripts/backup-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Carregar variáveis do .env
import { config } from 'dotenv';
config();

// Configure suas credenciais do Supabase aqui
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Lista de todas as tabelas que você quer fazer backup
const TABLES = [
  'profiles',
  'categorias',
  'contas',
  'lancamentos',
  'unidades'
];

async function exportTable(tableName: string) {
  console.log(`📦 Exportando ${tableName}...`);

  const { data, error } = await supabase
    .from(tableName)
    .select('*');

  if (error) {
    console.error(`❌ Erro ao exportar ${tableName}:`, error);
    return;
  }

  if (!data || data.length === 0) {
    console.log(`⚠️  Tabela ${tableName} está vazia`);
    return;
  }

  // Criar pasta de backups
  const backupDir = join(process.cwd(), 'backups', new Date().toISOString().split('T')[0]);
  mkdirSync(backupDir, { recursive: true });

  // Salvar como JSON
  const jsonPath = join(backupDir, `${tableName}.json`);
  writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`✅ JSON salvo: ${jsonPath}`);

  // Salvar como CSV
  if (data.length > 0) {
    const csvPath = join(backupDir, `${tableName}.csv`);
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escapar valores com vírgula ou aspas
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ];
    writeFileSync(csvPath, csvRows.join('\n'));
    console.log(`✅ CSV salvo: ${csvPath}`);
  }

  console.log(`✨ ${data.length} registros exportados de ${tableName}\n`);
}

async function backupAll() {
  console.log('🚀 Iniciando backup do Supabase...\n');
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}\n`);

  for (const table of TABLES) {
    await exportTable(table);
  }

  console.log('✅ Backup completo! Os arquivos estão na pasta /backups');
  console.log('📂 Você tem os dados em CSV e JSON para máxima segurança');
}

backupAll().catch(console.error);
