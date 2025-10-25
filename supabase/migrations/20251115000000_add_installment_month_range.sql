-- Add optional start and end month markers for installment purchases
ALTER TABLE public.financial_items
  ADD COLUMN IF NOT EXISTS installment_start_month DATE;

ALTER TABLE public.financial_items
  ADD COLUMN IF NOT EXISTS installment_end_month DATE;

CREATE INDEX IF NOT EXISTS idx_financial_items_installment_start
  ON public.financial_items(installment_start_month)
  WHERE installment_start_month IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_items_installment_end
  ON public.financial_items(installment_end_month)
  WHERE installment_end_month IS NOT NULL;
