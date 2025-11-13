-- =====================================================
-- FORÇAR RELOAD DO SCHEMA (Método Garantido)
-- =====================================================
-- Este método SEMPRE funciona porque força o PostgREST a detectar mudanças
-- =====================================================

-- Método 1: Adicionar e remover coluna dummy
ALTER TABLE public.credit_cards ADD COLUMN _force_reload BOOLEAN DEFAULT false;
ALTER TABLE public.credit_cards DROP COLUMN _force_reload;

-- Método 2: Comentário força atualização do schema
COMMENT ON TABLE public.credit_cards IS 'Cadastro de cartões de crédito - Schema atualizado';

-- Verificar que card_type existe
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'credit_cards'
  AND column_name = 'card_type';

-- Se retornou resultado acima, está OK!
-- Agora tente criar um cartão no app
