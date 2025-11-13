#!/bin/bash

# Exportar TODAS as tabelas do Supabase para CSV
# Pode abrir no Excel, Numbers, Google Sheets, etc!

export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
PGPASSWORD="hju5ygv7kgr_CZM5rnq"

echo "🔥 EXPORTANDO TUDO PARA CSV..."
echo ""

mkdir -p backups/csv-files

# Lista de todas as tabelas
TABLES=(
  "financial_items"
  "categories"
  "business_units"
  "unit_categories"
  "bank_balances"
  "recurring_bills"
  "recurring_bills_instances"
  "user_profiles"
  "credit_card_charges"
  "credit_cards"
  "investments"
  "investment_transactions"
  "investment_categories"
  "financial_summary"
  "financial_summary_income"
  "bill_adjustments"
  "recurring_templates"
  "invoice_payments"
)

for table in "${TABLES[@]}"; do
  echo "📊 Exportando $table..."

  psql -h db.fywrdmboiaqiopxqmywo.supabase.co \
       -p 5432 \
       -U postgres \
       -d postgres \
       -c "\\COPY (SELECT * FROM public.\"${table}\") TO STDOUT WITH CSV HEADER" \
       > "backups/csv-files/${table}.csv" 2>/dev/null

  if [ -s "backups/csv-files/${table}.csv" ]; then
    lines=$(wc -l < "backups/csv-files/${table}.csv")
    echo "   ✅ $((lines - 1)) registros salvos"
  else
    echo "   ⚠️  Vazio"
    rm -f "backups/csv-files/${table}.csv"
  fi
  echo ""
done

echo "═══════════════════════════════════════════════════════"
echo "✅ EXPORTAÇÃO COMPLETA!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📂 Pasta: backups/csv-files/"
echo ""
echo "Arquivos CSV criados:"
ls -lh backups/csv-files/*.csv 2>/dev/null | awk '{print "  📄 " $9 " (" $5 ")"}'
echo ""
echo "🎉 Pode abrir no Excel, Numbers, Google Sheets!"
