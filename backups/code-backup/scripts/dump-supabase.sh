#!/bin/bash

# Script para fazer dump completo do Supabase
# Uso: ./scripts/dump-supabase.sh

set -e

# Carregar variáveis do .env
source .env 2>/dev/null || true

# Extrair o project ref da URL
PROJECT_REF=$(echo $VITE_SUPABASE_URL | sed -n 's/.*\/\/\([^.]*\).supabase.co.*/\1/p')

echo "🚀 Fazendo dump do Supabase..."
echo "📦 Projeto: $PROJECT_REF"
echo ""

# Criar pasta de backups
mkdir -p backups/sql-dumps

# URL de conexão do banco
DB_URL="postgresql://postgres:[password]@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo "⚠️  IMPORTANTE: Você precisa ter a senha do banco!"
echo "   Pegue em: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
echo ""
read -sp "Digite a senha do banco (será oculta): " DB_PASSWORD
echo ""

# Substituir [password] pela senha real
DB_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

echo ""
echo "📄 Fazendo dump do SCHEMA..."
supabase db dump --db-url "$DB_URL" --schema public > backups/sql-dumps/schema.sql
echo "✅ Schema salvo em: backups/sql-dumps/schema.sql"

echo ""
echo "📊 Fazendo dump dos DADOS..."
supabase db dump --db-url "$DB_URL" --data-only > backups/sql-dumps/data.sql
echo "✅ Dados salvos em: backups/sql-dumps/data.sql"

echo ""
echo "═══════════════════════════════════"
echo "✅ DUMP COMPLETO!"
echo "📂 Arquivos em: backups/sql-dumps/"
echo "   - schema.sql (estrutura)"
echo "   - data.sql (dados)"
echo "═══════════════════════════════════"
