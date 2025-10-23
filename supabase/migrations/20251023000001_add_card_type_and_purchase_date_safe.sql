-- Migration: Add card_type to credit_cards and purchase_date to financial_items
-- Created: 2025-10-23
-- Purpose: Differentiate prepaid vs credit cards and track actual purchase date
-- Version: SAFE (checks if tables exist first)

-- =====================================================
-- PART 1: Check if credit_cards table exists
-- =====================================================

DO $$
BEGIN
  -- Check if credit_cards table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'credit_cards'
  ) THEN
    RAISE EXCEPTION 'ERROR: Table "credit_cards" does not exist. Please run migration 20251014000005_recurring_expenses_and_credit_cards.sql first';
  END IF;

  -- Check if financial_items table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'financial_items'
  ) THEN
    RAISE EXCEPTION 'ERROR: Table "financial_items" does not exist. Please check your database setup';
  END IF;

  RAISE NOTICE 'All required tables exist. Proceeding with migration...';
END $$;

-- =====================================================
-- PART 2: Add card_type to credit_cards table
-- =====================================================

-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'credit_cards'
    AND column_name = 'card_type'
  ) THEN
    ALTER TABLE public.credit_cards
    ADD COLUMN card_type TEXT NOT NULL DEFAULT 'credit'
    CHECK (card_type IN ('prepaid', 'credit'));

    RAISE NOTICE 'Column "card_type" added to credit_cards table';
  ELSE
    RAISE NOTICE 'Column "card_type" already exists in credit_cards table';
  END IF;
END $$;

-- Add comment explaining the field
COMMENT ON COLUMN public.credit_cards.card_type IS
'Type of card: "prepaid" (debit/prepaid, affects balance immediately) or "credit" (affects balance when invoice is paid)';

-- =====================================================
-- PART 3: Add purchase_date to financial_items table
-- =====================================================

-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'financial_items'
    AND column_name = 'purchase_date'
  ) THEN
    ALTER TABLE public.financial_items
    ADD COLUMN purchase_date DATE;

    RAISE NOTICE 'Column "purchase_date" added to financial_items table';
  ELSE
    RAISE NOTICE 'Column "purchase_date" already exists in financial_items table';
  END IF;
END $$;

-- Add comment explaining the field
COMMENT ON COLUMN public.financial_items.purchase_date IS
'Actual date of purchase (for credit cards). The "date" field represents when the transaction affects the balance (invoice month for credit cards)';

-- =====================================================
-- PART 4: Create indexes for better query performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_financial_items_purchase_date
ON public.financial_items(purchase_date)
WHERE purchase_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_cards_card_type
ON public.credit_cards(card_type, user_id)
WHERE is_active = true;

-- =====================================================
-- PART 5: Update existing records
-- =====================================================

-- Set purchase_date = date for existing credit card transactions
UPDATE public.financial_items
SET purchase_date = date
WHERE credit_card IS NOT NULL
  AND purchase_date IS NULL;

-- =====================================================
-- PART 6: Recreate the credit_card_invoices view
-- =====================================================

-- Check if view exists and drop it
DROP VIEW IF EXISTS public.credit_card_invoices;

-- Create the updated view
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

-- Set owner
ALTER VIEW public.credit_card_invoices OWNER TO postgres;

-- =====================================================
-- FINAL: Verify migration
-- =====================================================

DO $$
DECLARE
  card_type_exists BOOLEAN;
  purchase_date_exists BOOLEAN;
  view_exists BOOLEAN;
BEGIN
  -- Check card_type column
  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'credit_cards'
    AND column_name = 'card_type'
  ) INTO card_type_exists;

  -- Check purchase_date column
  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'financial_items'
    AND column_name = 'purchase_date'
  ) INTO purchase_date_exists;

  -- Check view
  SELECT EXISTS (
    SELECT FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name = 'credit_card_invoices'
  ) INTO view_exists;

  -- Report status
  IF card_type_exists AND purchase_date_exists AND view_exists THEN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '✅ Column credit_cards.card_type: EXISTS';
    RAISE NOTICE '✅ Column financial_items.purchase_date: EXISTS';
    RAISE NOTICE '✅ View credit_card_invoices: EXISTS';
  ELSE
    RAISE WARNING '⚠️ Migration completed with warnings:';
    IF NOT card_type_exists THEN
      RAISE WARNING '❌ Column credit_cards.card_type: MISSING';
    END IF;
    IF NOT purchase_date_exists THEN
      RAISE WARNING '❌ Column financial_items.purchase_date: MISSING';
    END IF;
    IF NOT view_exists THEN
      RAISE WARNING '❌ View credit_card_invoices: MISSING';
    END IF;
  END IF;
END $$;
