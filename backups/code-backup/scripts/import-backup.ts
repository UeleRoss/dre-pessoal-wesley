/**
 * Script para importar dados do backup para o SQLite local
 *
 * Como usar:
 * 1. Certifique-se de que rodou o backup antes (npx tsx scripts/backup-supabase.ts)
 * 2. npx tsx scripts/import-backup.ts
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
import { homedir } from 'os';

// Caminho do banco SQLite (mesmo lugar que o Electron usa)
const dbPath = join(homedir(), 'Library', 'Application Support', 'dre-pessoal', 'dre', 'dre.db');

console.log('🚀 Importando backup para o SQLite local...\n');
console.log(`📂 Banco de dados: ${dbPath}\n`);

// Abrir banco
const db = new Database(dbPath);

// Encontrar a pasta de backup mais recente
const backupsDir = join(process.cwd(), 'backups');
const backupFolders = readdirSync(backupsDir).sort().reverse();

if (backupFolders.length === 0) {
  console.error('❌ Nenhum backup encontrado! Execute primeiro: npx tsx scripts/backup-supabase.ts');
  process.exit(1);
}

const latestBackup = join(backupsDir, backupFolders[0]);
console.log(`📦 Usando backup de: ${backupFolders[0]}\n`);

// Ordem de importação (por causa das chaves estrangeiras)
const IMPORT_ORDER = [
  'profiles',
  'unidades',
  'categorias',
  'contas',
  'lancamentos'
];

function importTable(tableName: string) {
  const jsonPath = join(latestBackup, `${tableName}.json`);

  try {
    const jsonData = readFileSync(jsonPath, 'utf-8');
    const records = JSON.parse(jsonData);

    if (records.length === 0) {
      console.log(`⚠️  ${tableName}: tabela vazia, pulando...\n`);
      return;
    }

    console.log(`📥 Importando ${tableName} (${records.length} registros)...`);

    // Limpar tabela antes de importar
    db.prepare(`DELETE FROM ${tableName}`).run();

    // Preparar statement de insert
    const columns = Object.keys(records[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const stmt = db.prepare(
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`
    );

    // Importar em transação (mais rápido)
    const insertMany = db.transaction((records: any[]) => {
      for (const record of records) {
        const values = columns.map(col => record[col]);
        stmt.run(...values);
      }
    });

    insertMany(records);

    console.log(`✅ ${tableName}: ${records.length} registros importados\n`);
  } catch (error: any) {
    console.error(`❌ Erro ao importar ${tableName}:`, error.message);
    console.log('');
  }
}

// Importar todas as tabelas na ordem correta
for (const table of IMPORT_ORDER) {
  importTable(table);
}

db.close();

console.log('✨ Importação concluída!');
console.log('🎉 Agora você pode rodar o app com: npm run electron:dev');
