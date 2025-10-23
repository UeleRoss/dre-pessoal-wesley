-- =====================================================
-- DIAGNÓSTICO: Verificar Estrutura do Banco
-- =====================================================
-- Execute este SQL PRIMEIRO no Supabase para ver o que você tem
-- =====================================================

-- 1. Ver todas as tabelas que existem
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Ver estrutura da tabela financial_items (se existir)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'financial_items'
ORDER BY ordinal_position;

-- 3. Verificar se existe tabela credit_cards
SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'credit_cards'
) AS credit_cards_exists;

-- 4. Se credit_cards existir, ver sua estrutura
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'credit_cards'
ORDER BY ordinal_position;

-- 5. Ver views existentes
SELECT
  table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Copie TODAS as mensagens que aparecerem após executar
-- e me envie para eu ajustar o SQL principal
-- =====================================================
