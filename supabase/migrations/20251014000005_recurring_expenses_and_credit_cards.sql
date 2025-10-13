-- =====================================================
-- Migration: Sistema de Contas Recorrentes e Gestão de Cartões de Crédito
-- Data: 2025-10-14
-- Descrição: Adiciona funcionalidades de contas recorrentes, parcelamento e gestão de faturas de cartão
-- =====================================================

-- =====================================================
-- 0. CRIAR FUNÇÃO update_updated_at_column (se não existir)
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =====================================================
-- 1. ADICIONAR CAMPOS EM financial_items
-- =====================================================

-- Campos para contas recorrentes
ALTER TABLE public.financial_items
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_template_id UUID NULL REFERENCES public.financial_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recurring_status TEXT CHECK (recurring_status IN ('pending', 'approved', 'skipped')) DEFAULT NULL;

-- Campos para cartão de crédito
ALTER TABLE public.financial_items
ADD COLUMN IF NOT EXISTS credit_card TEXT NULL;

-- Campos para parcelamento
ALTER TABLE public.financial_items
ADD COLUMN IF NOT EXISTS is_installment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS installment_number INTEGER NULL,
ADD COLUMN IF NOT EXISTS total_installments INTEGER NULL,
ADD COLUMN IF NOT EXISTS installment_group_id UUID NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_financial_items_credit_card ON public.financial_items(credit_card, user_id);
CREATE INDEX IF NOT EXISTS idx_financial_items_recurring ON public.financial_items(is_recurring, recurring_status) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_financial_items_installments ON public.financial_items(installment_group_id) WHERE installment_group_id IS NOT NULL;

-- =====================================================
-- 2. CRIAR TABELA recurring_templates
-- =====================================================

CREATE TABLE IF NOT EXISTS public.recurring_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  business_unit_id UUID NULL,
  credit_card TEXT NULL,
  is_active BOOLEAN DEFAULT true,
  last_generated_month DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recurring templates"
ON public.recurring_templates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring templates"
ON public.recurring_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring templates"
ON public.recurring_templates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring templates"
ON public.recurring_templates FOR DELETE
USING (auth.uid() = user_id);

-- Índice
CREATE INDEX IF NOT EXISTS idx_recurring_templates_user_active
ON public.recurring_templates(user_id, is_active) WHERE is_active = true;

-- Trigger para updated_at
CREATE TRIGGER update_recurring_templates_updated_at
BEFORE UPDATE ON public.recurring_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 3. CRIAR TABELA credit_cards
-- =====================================================

CREATE TABLE IF NOT EXISTS public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
  credit_limit DECIMAL(10,2) NULL,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, name)
);

-- RLS
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit cards"
ON public.credit_cards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit cards"
ON public.credit_cards FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit cards"
ON public.credit_cards FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit cards"
ON public.credit_cards FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_credit_cards_updated_at
BEFORE UPDATE ON public.credit_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. CRIAR TABELA invoice_payments
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  reference_month DATE NOT NULL,
  invoice_amount DECIMAL(10,2) NOT NULL,
  paid BOOLEAN DEFAULT false,
  payment_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, credit_card_id, reference_month)
);

-- RLS
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoice payments"
ON public.invoice_payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoice payments"
ON public.invoice_payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoice payments"
ON public.invoice_payments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoice payments"
ON public.invoice_payments FOR DELETE
USING (auth.uid() = user_id);

-- Índice
CREATE INDEX IF NOT EXISTS idx_invoice_payments_month
ON public.invoice_payments(user_id, reference_month);

-- Trigger para updated_at
CREATE TRIGGER update_invoice_payments_updated_at
BEFORE UPDATE ON public.invoice_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. FUNÇÃO: Gerar Recorrentes Pendentes
-- =====================================================

CREATE OR REPLACE FUNCTION generate_pending_recurring_expenses(
  target_user_id UUID,
  target_month DATE
) RETURNS void AS $$
BEGIN
  -- Gerar lançamentos recorrentes pendentes
  INSERT INTO public.financial_items (
    user_id, date, type, amount, description, category,
    business_unit_id, credit_card, bank, source,
    is_recurring, recurring_template_id, recurring_status
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

  -- Atualizar last_generated_month
  UPDATE public.recurring_templates
  SET last_generated_month = target_month,
      updated_at = now()
  WHERE user_id = target_user_id
    AND is_active = true
    AND (last_generated_month IS NULL OR last_generated_month < target_month);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. FUNÇÃO: Criar Compra Parcelada
-- =====================================================

CREATE OR REPLACE FUNCTION create_installment_purchase(
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
  v_i INTEGER;
BEGIN
  -- Gerar ID único para o grupo de parcelas
  v_group_id := gen_random_uuid();

  -- Calcular valor de cada parcela
  v_installment_amount := ROUND(p_total_amount / p_total_installments, 2);

  -- Criar cada parcela
  FOR v_i IN 1..p_total_installments LOOP
    v_current_date := p_start_date + (v_i - 1) * INTERVAL '1 month';

    INSERT INTO public.financial_items (
      user_id, date, type, amount,
      description, category, credit_card, bank,
      business_unit_id, source,
      is_installment, installment_number, total_installments, installment_group_id
    ) VALUES (
      p_user_id,
      v_current_date,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. VIEW: Faturas Consolidadas
-- =====================================================

CREATE OR REPLACE VIEW credit_card_invoices AS
SELECT
  cc.id AS credit_card_id,
  cc.user_id,
  cc.name AS card_name,
  cc.due_day,
  cc.color,
  DATE_TRUNC('month', fi.date)::DATE AS reference_month,
  COUNT(DISTINCT fi.id) AS total_items,
  COUNT(DISTINCT CASE WHEN fi.is_recurring THEN fi.id END) AS recurring_items,
  COUNT(DISTINCT CASE WHEN fi.is_installment THEN fi.id END) AS installment_items,
  COALESCE(SUM(fi.amount), 0) AS total_amount,
  COALESCE(SUM(CASE WHEN fi.is_recurring THEN fi.amount ELSE 0 END), 0) AS recurring_amount,
  COALESCE(SUM(CASE WHEN fi.is_installment THEN fi.amount ELSE 0 END), 0) AS installment_amount,
  COALESCE(ip.paid, false) AS is_paid,
  ip.payment_date
FROM public.credit_cards cc
LEFT JOIN public.financial_items fi ON fi.credit_card = cc.name
  AND fi.user_id = cc.user_id
  AND fi.type = 'saida'
LEFT JOIN public.invoice_payments ip ON ip.credit_card_id = cc.id
  AND ip.reference_month = DATE_TRUNC('month', fi.date)::DATE
WHERE cc.is_active = true
GROUP BY cc.id, cc.user_id, cc.name, cc.due_day, cc.color,
         DATE_TRUNC('month', fi.date)::DATE, ip.paid, ip.payment_date
ORDER BY reference_month DESC NULLS LAST, cc.name;

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON TABLE public.recurring_templates IS 'Templates para gerar automaticamente contas recorrentes a cada mês';
COMMENT ON TABLE public.credit_cards IS 'Cadastro de cartões de crédito do usuário para gestão de faturas';
COMMENT ON TABLE public.invoice_payments IS 'Controle de pagamento de faturas mensais dos cartões';
COMMENT ON FUNCTION generate_pending_recurring_expenses IS 'Gera lançamentos pendentes para contas recorrentes do mês especificado';
COMMENT ON FUNCTION create_installment_purchase IS 'Cria múltiplas parcelas para uma compra parcelada';
COMMENT ON VIEW credit_card_invoices IS 'View consolidada com faturas de cada cartão por mês';
