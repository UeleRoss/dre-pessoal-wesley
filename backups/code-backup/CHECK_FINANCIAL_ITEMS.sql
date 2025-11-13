-- Ver estrutura da tabela financial_items
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'financial_items'
ORDER BY ordinal_position;
