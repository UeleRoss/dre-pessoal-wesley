-- Atualizar tipos de lançamentos para 'entrada' e 'saida' e ajustar constraint

-- Migrar dados existentes (receita/despesa -> entrada/saida)
UPDATE public.financial_items
SET type = 'entrada'
WHERE type = 'receita';

UPDATE public.financial_items
SET type = 'saida'
WHERE type = 'despesa';

-- Atualizar constraint do tipo
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'financial_items'
      AND constraint_name = 'financial_items_type_check'
  ) THEN
    ALTER TABLE public.financial_items
      DROP CONSTRAINT financial_items_type_check;
  END IF;
END
$$;

ALTER TABLE public.financial_items
  ADD CONSTRAINT financial_items_type_check
  CHECK (type IN ('entrada', 'saida'));
