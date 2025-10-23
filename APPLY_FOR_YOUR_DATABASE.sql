-- =====================================================
-- MIGRATION ADAPTADA PARA SEU BANCO (SEM user_id)
-- =====================================================
-- Sistema single-user (sem autenticação multi-usuário)
-- =====================================================

-- =====================================================
-- PARTE 1: ADICIONAR COLUNAS NECESSÁRIAS
-- =====================================================

-- Adicionar coluna credit_card em financial_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_items' AND column_name='credit_card') THEN
    ALTER TABLE public.financial_items ADD COLUMN credit_card TEXT NULL;
    RAISE NOTICE '✅ Coluna credit_card adicionada';
  ELSE
    RAISE NOTICE 'ℹ️  Coluna credit_card já existe';
  END IF;
END $$;

-- Adicionar coluna purchase_date em financial_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_items' AND column_name='purchase_date') THEN
    ALTER TABLE public.financial_items ADD COLUMN purchase_date DATE;
    RAISE NOTICE '✅ Coluna purchase_date adicionada';
  ELSE
    RAISE NOTICE 'ℹ️  Coluna purchase_date já existe';
  END IF;
END $$;

-- Adicionar coluna installment_group_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_items' AND column_name='installment_group_id') THEN
    ALTER TABLE public.financial_items ADD COLUMN installment_group_id UUID NULL;
    RAISE NOTICE '✅ Coluna installment_group_id adicionada';
  ELSE
    RAISE NOTICE 'ℹ️  Coluna installment_group_id já existe';
  END IF;
END $$;

-- Adicionar coluna recurring_template_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_items' AND column_name='recurring_template_id') THEN
    ALTER TABLE public.financial_items ADD COLUMN recurring_template_id UUID NULL;
    RAISE NOTICE '✅ Coluna recurring_template_id adicionada';
  ELSE
    RAISE NOTICE 'ℹ️  Coluna recurring_template_id já existe';
  END IF;
END $$;

-- =====================================================
-- PARTE 2: CRIAR TABELA CREDIT_CARDS (SEM user_id)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
  credit_limit DECIMAL(10,2) NULL,
  color TEXT DEFAULT '#3b82f6',
  card_type TEXT NOT NULL DEFAULT 'credit' CHECK (card_type IN ('prepaid', 'credit')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Comentários
COMMENT ON TABLE public.credit_cards IS 'Cadastro de cartões de crédito para gestão de faturas';
COMMENT ON COLUMN public.credit_cards.card_type IS 'Type of card: "prepaid" (affects balance immediately) or "credit" (affects balance when invoice is paid)';
COMMENT ON COLUMN public.financial_items.purchase_date IS 'Actual date of purchase (for credit cards)';

-- =====================================================
-- PARTE 3: CRIAR TABELA INVOICE_PAYMENTS (SEM user_id)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL,
  invoice_amount DECIMAL(10,2) NOT NULL,
  paid BOOLEAN DEFAULT false,
  payment_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(credit_card_id, reference_month)
);

-- =====================================================
-- PARTE 4: CRIAR ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_financial_items_credit_card ON public.financial_items(credit_card);
CREATE INDEX IF NOT EXISTS idx_financial_items_purchase_date ON public.financial_items(purchase_date) WHERE purchase_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_financial_items_installment_group ON public.financial_items(installment_group_id) WHERE installment_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_cards_active ON public.credit_cards(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_invoice_payments_month ON public.invoice_payments(reference_month);

-- =====================================================
-- PARTE 5: ATUALIZAR DADOS EXISTENTES
-- =====================================================

-- Atualizar purchase_date para transações existentes com cartão
UPDATE public.financial_items
SET purchase_date = date::DATE
WHERE credit_card IS NOT NULL AND purchase_date IS NULL;

-- =====================================================
-- PARTE 6: VIEW DE FATURAS (SEM user_id)
-- =====================================================

DROP VIEW IF EXISTS public.credit_card_invoices;

CREATE OR REPLACE VIEW public.credit_card_invoices AS
SELECT
    cc.id AS credit_card_id,
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
    AND fi.type IN ('saida', 'expense', 'despesa')
LEFT JOIN public.invoice_payments ip ON ip.credit_card_id = cc.id
    AND ip.reference_month = DATE_TRUNC('month', fi.date)::DATE
WHERE cc.is_active = true
GROUP BY
    cc.id, cc.name, cc.due_day, cc.closing_day, cc.color, cc.card_type,
    DATE_TRUNC('month', fi.date)::DATE, ip.paid, ip.payment_date, ip.notes
ORDER BY reference_month DESC, card_name;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  columns_ok BOOLEAN;
  view_ok BOOLEAN;
BEGIN
  -- Verificar tabela credit_cards
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'credit_cards'
  ) INTO table_exists;

  -- Verificar colunas
  SELECT COUNT(*) = 3 INTO columns_ok
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND (
    (table_name = 'credit_cards' AND column_name = 'card_type')
    OR (table_name = 'financial_items' AND column_name = 'purchase_date')
    OR (table_name = 'financial_items' AND column_name = 'credit_card')
  );

  -- Verificar view
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'credit_card_invoices'
  ) INTO view_ok;

  IF table_exists AND columns_ok AND view_ok THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ========================================';
    RAISE NOTICE '🎉 MIGRATION CONCLUÍDA COM SUCESSO!';
    RAISE NOTICE '🎉 ========================================';
    RAISE NOTICE '✅ Tabela criada: credit_cards';
    RAISE NOTICE '✅ Tabela criada: invoice_payments';
    RAISE NOTICE '✅ Coluna adicionada: financial_items.credit_card';
    RAISE NOTICE '✅ Coluna adicionada: financial_items.purchase_date';
    RAISE NOTICE '✅ Coluna adicionada: financial_items.installment_group_id';
    RAISE NOTICE '✅ View criada: credit_card_invoices';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Próximos passos:';
    RAISE NOTICE '1. Recarregue seu app (localhost:8080)';
    RAISE NOTICE '2. Vá em Cartões de Crédito';
    RAISE NOTICE '3. Cadastre seus cartões';
    RAISE NOTICE '';
  ELSE
    RAISE WARNING '⚠️  Alguns componentes podem estar faltando:';
    IF NOT table_exists THEN
      RAISE WARNING '❌ Tabela credit_cards não foi criada';
    END IF;
    IF NOT columns_ok THEN
      RAISE WARNING '❌ Nem todas as colunas foram adicionadas';
    END IF;
    IF NOT view_ok THEN
      RAISE WARNING '❌ View não foi criada';
    END IF;
  END IF;
END $$;
