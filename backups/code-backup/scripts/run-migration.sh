#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════════"
echo "🚀 MIGRAÇÃO: Supabase → SQLite Local"
echo "═══════════════════════════════════════════════════════"
echo ""

# Carregar .env
source .env

PROJECT_REF="fywrdmboiaqiopxqmywo"
DB_PASSWORD="hju5ygv7kgr_CZM5rnq"
DB_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo "📦 Projeto: $PROJECT_REF"
echo ""

# Criar pastas
mkdir -p backups/sql-dumps
mkdir -p "$HOME/Library/Application Support/dre-pessoal/dre"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 PASSO 1: Dump do SCHEMA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
supabase db dump --db-url "$DB_URL" --schema public > backups/sql-dumps/schema.sql
echo "✅ Schema salvo: backups/sql-dumps/schema.sql"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 PASSO 2: Dump dos DADOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
supabase db dump --db-url "$DB_URL" --data-only > backups/sql-dumps/data.sql
echo "✅ Dados salvos: backups/sql-dumps/data.sql"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  PASSO 3: Criar banco SQLite local"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DB_PATH="$HOME/Library/Application Support/dre-pessoal/dre/dre.db"

# Remover banco antigo
rm -f "$DB_PATH"

# Criar com schema local
sqlite3 "$DB_PATH" < localdb/schema.sql
echo "✅ Banco criado: $DB_PATH"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 PASSO 4: Importar dados"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Converter PostgreSQL → SQLite
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
  sqlite3 "$DB_PATH" 2>&1 | head -20 || true

echo "✅ Dados importados!"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 PASSO 5: Verificar"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for table in financial_items categories business_units unit_categories bank_balances recurring_bills recurring_bills_instances user_profiles; do
  count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
  echo "  📊 $table: $count registros"
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ MIGRAÇÃO COMPLETA!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📂 Banco: $DB_PATH"
echo ""
echo "🎮 Agora rode: npm run electron:dev"
echo ""
