-- =====================================================
-- RECARREGAR SCHEMA DO SUPABASE
-- =====================================================
-- Execute este SQL para forçar o Supabase a ver as novas colunas
-- =====================================================

-- Forçar reload do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';

-- Verificar se card_type existe
SELECT
  'card_type' as checking,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'credit_cards'
  AND column_name = 'card_type';

-- Verificar todas as colunas de credit_cards
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'credit_cards'
ORDER BY ordinal_position;
