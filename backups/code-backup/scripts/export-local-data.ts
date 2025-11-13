/**
 * Script para exportar dados do banco SQLite LOCAL
 * Use este script para fazer backup dos seus dados locais!
 *
 * Como usar:
 * npx tsx scripts/export-local-data.ts
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import Database from 'better-sqlite3';

// Caminho do banco SQLite (mesmo lugar que o Electron usa)
const dbPath = join(homedir(), 'Library', 'Application Support', 'dre-pessoal', 'dre', 'dre.db');

console.log('🚀 Exportando dados do banco LOCAL...\n');
console.log(`📂 Banco de dados: ${dbPath}\n`);

try {
  // Abrir banco
  const db = new Database(dbPath, { readonly: true });

  // Criar pasta de backups
  const backupDir = join(process.cwd(), 'backups', new Date().toISOString().split('T')[0]);
  mkdirSync(backupDir, { recursive: true });

  console.log(`💾 Salvando em: ${backupDir}\n`);

  // Lista de tabelas
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    AND name NOT LIKE 'sqlite_%'
  `).all() as { name: string }[];

  for (const { name: tableName } of tables) {
    console.log(`📦 Exportando ${tableName}...`);

    // Buscar todos os dados
    const data = db.prepare(`SELECT * FROM ${tableName}`).all();

    if (data.length === 0) {
      console.log(`⚠️  Tabela ${tableName} está vazia\n`);
      continue;
    }

    // Salvar como JSON
    const jsonPath = join(backupDir, `${tableName}.json`);
    writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    console.log(`✅ JSON salvo: ${jsonPath}`);

    // Salvar como CSV
    const csvPath = join(backupDir, `${tableName}.csv`);
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = (row as any)[header];
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
    console.log(`✨ ${data.length} registros exportados\n`);
  }

  db.close();

  console.log('\n🎉 Backup completo!');
  console.log(`📂 Pasta: ${backupDir}`);
  console.log('💡 Dica: Copie esta pasta para um lugar seguro (pen drive, nuvem, etc)');

} catch (error: any) {
  if (error.code === 'SQLITE_CANTOPEN') {
    console.error('\n❌ Erro: Banco de dados não encontrado!');
    console.error('💡 Você precisa rodar o app pelo menos uma vez primeiro:');
    console.error('   npm run electron:dev\n');
  } else {
    console.error('\n❌ Erro ao exportar dados:', error.message);
  }
  process.exit(1);
}
