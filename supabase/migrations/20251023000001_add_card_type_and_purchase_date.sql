-- Migration: Add card_type to credit_cards and purchase_date to financial_items
-- Created: 2025-10-23
-- Purpose: Differentiate prepaid vs credit cards and track actual purchase date

-- 1. Add card_type to credit_cards table
ALTER TABLE public.credit_cards
ADD COLUMN IF NOT EXISTS card_type TEXT NOT NULL DEFAULT 'credit'
CHECK (card_type IN ('prepaid', 'credit'));

-- Add comment explaining the field
COMMENT ON COLUMN public.credit_cards.card_type IS
'Type of card: "prepaid" (debit/prepaid, affects balance immediately) or "credit" (affects balance when invoice is paid)';

-- 2. Add purchase_date to financial_items table
ALTER TABLE public.financial_items
ADD COLUMN IF NOT EXISTS purchase_date DATE;

-- Add comment explaining the field
COMMENT ON COLUMN public.financial_items.purchase_date IS
'Actual date of purchase (for credit cards). The "date" field represents when the transaction affects the balance (invoice month for credit cards)';

-- 3. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_financial_items_purchase_date
ON public.financial_items(purchase_date)
WHERE purchase_date IS NOT NULL;

-- 4. Add index on card_type for filtering
CREATE INDEX IF NOT EXISTS idx_credit_cards_card_type
ON public.credit_cards(card_type, user_id)
WHERE is_active = true;

-- 5. Update existing records: set purchase_date = date for existing credit card transactions
UPDATE public.financial_items
SET purchase_date = date
WHERE credit_card IS NOT NULL
  AND purchase_date IS NULL;

-- 6. Recreate the credit_card_invoices view to include card_type
DROP VIEW IF EXISTS public.credit_card_invoices;

CREATE OR REPLACE VIEW public.credit_card_invoices AS
SELECT
    cc.id AS credit_card_id,
    cc.user_id,
    cc.name AS card_name,
    cc.due_day,
    cc.closing_day,
    cc.color,
    cc.card_type,
    DATE_TRUNC('month', fi.date)::DATE AS reference_month,
    COUNT(fi.id) AS total_items,
    COUNT(CASE WHEN fi.is_recurring THEN fi.id END) AS recurring_items,
    COUNT(CASE WHEN fi.is_installment THEN fi.id END) AS installment_items,
    COALESCE(SUM(fi.amount), 0) AS total_amount,
    COALESCE(SUM(CASE WHEN fi.is_recurring THEN fi.amount ELSE 0 END), 0) AS recurring_amount,
    COALESCE(SUM(CASE WHEN fi.is_installment THEN fi.amount ELSE 0 END), 0) AS installment_amount,
    COALESCE(ip.paid, false) AS is_paid,
    ip.payment_date,
    ip.notes
FROM public.credit_cards cc
INNER JOIN public.financial_items fi ON fi.credit_card = cc.name
    AND fi.user_id = cc.user_id
    AND fi.type = 'saida'
LEFT JOIN public.invoice_payments ip ON ip.credit_card_id = cc.id
    AND ip.user_id = cc.user_id
    AND ip.reference_month = DATE_TRUNC('month', fi.date)::DATE
WHERE cc.is_active = true
GROUP BY
    cc.id,
    cc.user_id,
    cc.name,
    cc.due_day,
    cc.closing_day,
    cc.color,
    cc.card_type,
    DATE_TRUNC('month', fi.date)::DATE,
    ip.paid,
    ip.payment_date,
    ip.notes
ORDER BY reference_month DESC, card_name;

-- Grant permissions on the updated view
GRANT SELECT ON public.credit_card_invoices TO authenticated;

-- Add RLS policy for the view (inherited from base tables)
ALTER VIEW public.credit_card_invoices OWNER TO postgres;
