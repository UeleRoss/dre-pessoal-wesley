-- Add baseline_date column to control manual saldo resets for each bank
ALTER TABLE public.bank_balances
ADD COLUMN IF NOT EXISTS baseline_date DATE;

-- Populate baseline_date for existing registros
UPDATE public.bank_balances
SET baseline_date = COALESCE(updated_at::date, now()::date)
WHERE baseline_date IS NULL;

-- Garantir preenchimento automático nas próximas inserções
ALTER TABLE public.bank_balances
ALTER COLUMN baseline_date SET DEFAULT now()::date;

ALTER TABLE public.bank_balances
ALTER COLUMN baseline_date SET NOT NULL;
