-- =====================================================
-- Migration: Simplificação TOTAL da lógica de cartões
-- Data: 2025-10-24
-- Descrição: Remove toda complexidade, mantém apenas o básico
-- =====================================================

-- Limpar tudo que existe
DROP VIEW IF EXISTS public.credit_card_invoices CASCADE;
DROP FUNCTION IF EXISTS public.get_invoice_reference_month(DATE, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.create_installment_purchase CASCADE;
DROP FUNCTION IF EXISTS public.generate_pending_recurring_expenses CASCADE;

-- Remover colunas problemáticas se existirem
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_cards' AND column_name = 'card_type'
  ) THEN
    ALTER TABLE public.credit_cards DROP COLUMN card_type;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_items' AND column_name = 'purchase_date'
  ) THEN
    ALTER TABLE public.financial_items DROP COLUMN purchase_date;
  END IF;
END $$;

-- Remover índices antigos
DROP INDEX IF EXISTS public.idx_credit_cards_card_type;
DROP INDEX IF EXISTS public.idx_financial_items_purchase_date;

-- =====================================================
-- Tabela credit_cards: apenas o essencial
-- =====================================================
-- Campos:
-- - id, user_id, name (nome do cartão)
-- - due_day (dia vencimento)
-- - closing_day (dia fechamento)
-- - credit_limit (opcional)
-- - color (para UI)
-- - is_active, created_at, updated_at
-- =====================================================

-- A tabela já existe, só garantir os campos corretos
-- (sem card_type, sem purchase_date)

-- =====================================================
-- View SIMPLES: credit_card_invoices
-- Agrupa lançamentos por cartão e mês
-- =====================================================

CREATE OR REPLACE VIEW public.credit_card_invoices AS
SELECT
  cc.id AS credit_card_id,
  cc.user_id,
  cc.name AS card_name,
  cc.due_day,
  cc.closing_day,
  cc.color,
  DATE_TRUNC('month', fi.date)::DATE AS reference_month,
  COUNT(fi.id) AS total_items,
  COUNT(CASE WHEN fi.is_recurring THEN 1 END) AS recurring_items,
  COUNT(CASE WHEN fi.is_installment THEN 1 END) AS installment_items,
  COALESCE(SUM(fi.amount), 0) AS total_amount,
  COALESCE(SUM(CASE WHEN fi.is_recurring THEN fi.amount ELSE 0 END), 0) AS recurring_amount,
  COALESCE(SUM(CASE WHEN fi.is_installment THEN fi.amount ELSE 0 END), 0) AS installment_amount,
  COALESCE(ip.paid, false) AS is_paid,
  ip.payment_date,
  ip.notes
FROM public.credit_cards cc
LEFT JOIN public.financial_items fi
  ON fi.credit_card = cc.name
  AND fi.user_id = cc.user_id
  AND fi.type = 'saida'
LEFT JOIN public.invoice_payments ip
  ON ip.credit_card_id = cc.id
  AND ip.reference_month = DATE_TRUNC('month', fi.date)::DATE
WHERE cc.is_active = true
GROUP BY
  cc.id,
  cc.user_id,
  cc.name,
  cc.due_day,
  cc.closing_day,
  cc.color,
  DATE_TRUNC('month', fi.date)::DATE,
  ip.paid,
  ip.payment_date,
  ip.notes
ORDER BY reference_month DESC NULLS LAST, cc.name;

GRANT SELECT ON public.credit_card_invoices TO authenticated;

-- =====================================================
-- Função SIMPLES: criar parcelamento
-- Não precisa de card_type, apenas cria N lançamentos
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_installment_purchase(
  p_user_id UUID,
  p_type TEXT,
  p_total_amount DECIMAL,
  p_description TEXT,
  p_category TEXT,
  p_credit_card TEXT,
  p_business_unit_id UUID,
  p_start_date DATE,
  p_total_installments INTEGER
) RETURNS UUID AS $$
DECLARE
  v_group_id UUID;
  v_installment_amount DECIMAL;
  v_current_date DATE;
BEGIN
  v_group_id := gen_random_uuid();
  v_installment_amount := ROUND(p_total_amount / p_total_installments, 2);

  FOR i IN 1..p_total_installments LOOP
    v_current_date := p_start_date + ((i - 1) * INTERVAL '1 month');

    INSERT INTO public.financial_items (
      user_id,
      date,
      type,
      amount,
      description,
      category,
      credit_card,
      bank,
      business_unit_id,
      source,
      is_installment,
      installment_number,
      total_installments,
      installment_group_id
    ) VALUES (
      p_user_id,
      v_current_date,
      p_type,
      v_installment_amount,
      p_description || ' (' || i || '/' || p_total_installments || ')',
      p_category,
      p_credit_card,
      COALESCE(p_credit_card, 'N/A'),
      p_business_unit_id,
      'installment',
      true,
      i,
      p_total_installments,
      v_group_id
    );
  END LOOP;

  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Função SIMPLES: gerar recorrentes
-- Só cria lançamentos pendentes para aprovação
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_pending_recurring_expenses(
  target_user_id UUID,
  target_month DATE
) RETURNS void AS $$
BEGIN
  INSERT INTO public.financial_items (
    user_id,
    date,
    type,
    amount,
    description,
    category,
    business_unit_id,
    credit_card,
    bank,
    source,
    is_recurring,
    recurring_template_id,
    recurring_status
  )
  SELECT
    rt.user_id,
    target_month,
    rt.type,
    rt.amount,
    rt.description,
    rt.category,
    rt.business_unit_id,
    rt.credit_card,
    COALESCE(rt.credit_card, 'N/A'),
    'recurring_auto',
    true,
    rt.id,
    'pending'
  FROM public.recurring_templates rt
  WHERE rt.user_id = target_user_id
    AND rt.is_active = true
    AND (rt.last_generated_month IS NULL OR rt.last_generated_month < target_month)
    AND NOT EXISTS (
      SELECT 1 FROM public.financial_items fi
      WHERE fi.recurring_template_id = rt.id
        AND DATE_TRUNC('month', fi.date) = DATE_TRUNC('month', target_month)
    );

  UPDATE public.recurring_templates
  SET
    last_generated_month = target_month,
    updated_at = now()
  WHERE user_id = target_user_id
    AND is_active = true
    AND (last_generated_month IS NULL OR last_generated_month < target_month);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
