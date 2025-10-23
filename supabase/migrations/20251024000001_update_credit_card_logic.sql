-- =====================================================
-- Migration: Ajustes na lógica de cartões com card_type/purchase_date
-- Data: 2025-10-24
-- Descrição: adiciona helper para mês de referência e atualiza funções
-- =====================================================

-- Helper function para calcular o mês da fatura com base na data de compra
CREATE OR REPLACE FUNCTION public.get_invoice_reference_month(
  p_purchase_date DATE,
  p_closing_day INTEGER
) RETURNS DATE AS $$
DECLARE
  v_reference DATE;
BEGIN
  IF p_purchase_date IS NULL THEN
    RETURN NULL;
  END IF;

  v_reference := DATE_TRUNC('month', p_purchase_date)::DATE;

  IF p_closing_day IS NULL OR p_closing_day < 1 OR p_closing_day > 31 THEN
    p_closing_day := 31;
  END IF;

  IF EXTRACT(DAY FROM p_purchase_date) > p_closing_day THEN
    v_reference := (v_reference + INTERVAL '1 month')::DATE;
  END IF;

  RETURN v_reference;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- =====================================================
-- Atualiza função de compras parceladas para respeitar card_type
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
  v_card_type TEXT := 'prepaid';
  v_closing_day INTEGER := 31;
  v_first_reference DATE;
  v_reference DATE;
  v_installment_purchase_date DATE;
  v_i INTEGER;
BEGIN
  v_group_id := gen_random_uuid();
  v_installment_amount := ROUND(p_total_amount / p_total_installments, 2);

  IF p_credit_card IS NOT NULL THEN
    SELECT
      COALESCE(card_type, v_card_type),
      COALESCE(closing_day, v_closing_day)
    INTO v_card_type, v_closing_day
    FROM public.credit_cards
    WHERE user_id = p_user_id
      AND name = p_credit_card
    LIMIT 1;
  END IF;

  IF v_card_type = 'credit' THEN
    v_first_reference := public.get_invoice_reference_month(p_start_date, v_closing_day);
  ELSE
    v_first_reference := p_start_date;
  END IF;

  FOR v_i IN 1..p_total_installments LOOP
    IF v_card_type = 'credit' THEN
      v_reference := (v_first_reference + (v_i - 1) * INTERVAL '1 month')::DATE;
      v_installment_purchase_date := p_start_date;
    ELSE
      v_reference := (p_start_date + (v_i - 1) * INTERVAL '1 month')::DATE;
      v_installment_purchase_date := v_reference;
    END IF;

    INSERT INTO public.financial_items (
      user_id,
      date,
      purchase_date,
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
      v_reference,
      v_installment_purchase_date,
      p_type,
      v_installment_amount,
      p_description || ' (' || v_i || '/' || p_total_installments || ')',
      p_category,
      p_credit_card,
      COALESCE(p_credit_card, 'N/A'),
      p_business_unit_id,
      'installment',
      true,
      v_i,
      p_total_installments,
      v_group_id
    );
  END LOOP;

  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_invoice_reference_month IS
'Calcula o mês de referência da fatura (primeiro dia do mês) considerando o dia de fechamento';

-- =====================================================
-- Atualiza função de recorrentes para preencher purchase_date
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_pending_recurring_expenses(
  target_user_id UUID,
  target_month DATE
) RETURNS void AS $$
BEGIN
  INSERT INTO public.financial_items (
    user_id,
    date,
    purchase_date,
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
  SET last_generated_month = target_month,
      updated_at = now()
  WHERE user_id = target_user_id
    AND is_active = true
    AND (last_generated_month IS NULL OR last_generated_month < target_month);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
