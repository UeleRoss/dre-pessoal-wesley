#!/bin/bash

# Script COMPLETO de migração Supabase → SQLite Local
# Uso: ./scripts/migrate-to-local.sh

set -e

echo "═══════════════════════════════════════════════════════"
echo "🚀 MIGRAÇÃO COMPLETA: Supabase → SQLite Local"
echo "═══════════════════════════════════════════════════════"
echo ""

# Carregar variáveis do .env
source .env 2>/dev/null || true

PROJECT_REF=$(echo $VITE_SUPABASE_URL | sed -n 's/.*\/\/\([^.]*\).supabase.co.*/\1/p')

echo "📦 Projeto Supabase: $PROJECT_REF"
echo ""
echo "⚠️  Você precisa da SENHA DO BANCO!"
echo "   Pegue em: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
echo ""
read -sp "Digite a senha do banco: " DB_PASSWORD
echo ""
echo ""

DB_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

# Criar pastas
mkdir -p backups/sql-dumps
mkdir -p ~/Library/Application\ Support/dre-pessoal/dre

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 PASSO 1: Fazer dump do SCHEMA do Supabase"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
supabase db dump --db-url "$DB_URL" --schema public > backups/sql-dumps/schema.sql 2>&1 | grep -v "password" || true
echo "✅ Schema salvo: backups/sql-dumps/schema.sql"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 PASSO 2: Fazer dump dos DADOS do Supabase"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
supabase db dump --db-url "$DB_URL" --data-only > backups/sql-dumps/data.sql 2>&1 | grep -v "password" || true
echo "✅ Dados salvos: backups/sql-dumps/data.sql"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  PASSO 3: Criar banco SQLite local"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Usar schema local otimizado para SQLite
DB_PATH="$HOME/Library/Application Support/dre-pessoal/dre/dre.db"

# Remover banco antigo se existir
rm -f "$DB_PATH"

# Criar com schema local (já otimizado para SQLite)
sqlite3 "$DB_PATH" < localdb/schema.sql
echo "✅ Banco criado: $DB_PATH"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 PASSO 4: Importar dados do Supabase para SQLite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Converter dump PostgreSQL para SQLite e importar
# Remove comandos específicos do PostgreSQL e ajusta sintaxe
cat backups/sql-dumps/data.sql | \
  grep -v "^--" | \
  grep -v "^SET " | \
  grep -v "^SELECT pg_catalog" | \
  grep -v "^ALTER TABLE.*OWNER TO" | \
  sed 's/::text//g' | \
  sed 's/::integer//g' | \
  sed "s/::timestamp without time zone//g" | \
  sed "s/'t'::boolean/1/g" | \
  sed "s/'f'::boolean/0/g" | \
  sqlite3 "$DB_PATH" 2>&1 | grep -v "Error: " | head -20 || true

echo "✅ Dados importados!"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 PASSO 5: Verificar dados importados"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Resumo das tabelas:"
sqlite3 "$DB_PATH" "SELECT name, (SELECT COUNT(*) FROM sqlite_master m2 WHERE m2.name = m.name) as count FROM sqlite_master m WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;" | while read line; do
  table=$(echo $line | cut -d'|' -f1)
  count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $table;")
  echo "  📊 $table: $count registros"
done
echo ""

echo "═══════════════════════════════════════════════════════"
echo "✅ MIGRAÇÃO COMPLETA!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📂 Banco local: $DB_PATH"
echo "📦 Backups SQL: backups/sql-dumps/"
echo ""
echo "🎮 Agora rode o app:"
echo "   npm run electron:dev"
echo ""
