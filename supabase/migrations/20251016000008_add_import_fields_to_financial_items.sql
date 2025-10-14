-- Adicionar campos para controle de importação de PDF
-- needs_review: indica se o lançamento precisa de revisão manual
-- imported_from: rastreia a origem da importação

ALTER TABLE public.financial_items
  ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS imported_from text;

-- Criar índice para facilitar busca de itens que precisam revisão
CREATE INDEX IF NOT EXISTS idx_financial_items_needs_review
  ON public.financial_items(needs_review)
  WHERE needs_review = true;

-- Comentários explicativos
COMMENT ON COLUMN public.financial_items.needs_review IS 'Indica se o lançamento foi importado e precisa de revisão manual para categorização';
COMMENT ON COLUMN public.financial_items.imported_from IS 'Origem da importação (ex: "PDF - C6 Bank", "CSV - Nubank")';
