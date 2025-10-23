-- =====================================================
-- MIGRATION COMPLETA: Cartões de Crédito + Melhorias
-- =====================================================
-- INSTRUÇÕES:
-- 1. Copie TODO este arquivo
-- 2. Acesse Supabase Dashboard > SQL Editor
-- 3. Cole e Execute (Run)
-- 4. Aguarde mensagens de sucesso
-- =====================================================

-- =====================================================
-- PARTE 1: CRIAR TABELAS BASE (se não existirem)
-- =====================================================

-- Função de update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Adicionar campos em financial_items (se não existirem)
DO $$
BEGIN
  -- Campos para contas recorrentes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_items' AND column_name='is_recurring') THEN
    ALTER TABLE public.financial_items ADD COLUMN is_recurring BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_items' AND column_name='recurring_template_id') THEN
    ALTER TABLE public.financial_items ADD COLUMN recurring_template_id UUID NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_items' AND column_name='recurring_status') THEN
    ALTER TABLE public.financial_items ADD COLUMN recurring_status TEXT CHECK (recurring_status IN ('pending', 'approved', 'skipped')) DEFAULT NULL;
  END IF;

  -- Campos para cartão de crédito
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_items' AND column_name='credit_card') THEN
    ALTER TABLE public.financial_items ADD COLUMN credit_card TEXT NULL;
  END IF;

  -- Campos para parcelamento
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_items' AND column_name='is_installment') THEN
    ALTER TABLE public.financial_items ADD COLUMN is_installment BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_items' AND column_name='installment_number') THEN
    ALTER TABLE public.financial_items ADD COLUMN installment_number INTEGER NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_items' AND column_name='total_installments') THEN
    ALTER TABLE public.financial_items ADD COLUMN total_installments INTEGER NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_items' AND column_name='installment_group_id') THEN
    ALTER TABLE public.financial_items ADD COLUMN installment_group_id UUID NULL;
  END IF;

  RAISE NOTICE '✅ Campos adicionados em financial_items';
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_financial_items_credit_card ON public.financial_items(credit_card, user_id);
CREATE INDEX IF NOT EXISTS idx_financial_items_recurring ON public.financial_items(is_recurring, recurring_status) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_financial_items_installments ON public.financial_items(installment_group_id) WHERE installment_group_id IS NOT NULL;

-- Tabela recurring_templates
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

-- RLS para recurring_templates
ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recurring_templates' AND policyname = 'Users can view their own recurring templates') THEN
    CREATE POLICY "Users can view their own recurring templates" ON public.recurring_templates FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recurring_templates' AND policyname = 'Users can create their own recurring templates') THEN
    CREATE POLICY "Users can create their own recurring templates" ON public.recurring_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recurring_templates' AND policyname = 'Users can update their own recurring templates') THEN
    CREATE POLICY "Users can update their own recurring templates" ON public.recurring_templates FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recurring_templates' AND policyname = 'Users can delete their own recurring templates') THEN
    CREATE POLICY "Users can delete their own recurring templates" ON public.recurring_templates FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recurring_templates_user_active ON public.recurring_templates(user_id, is_active) WHERE is_active = true;

-- Trigger para recurring_templates
DROP TRIGGER IF EXISTS update_recurring_templates_updated_at ON public.recurring_templates;
CREATE TRIGGER update_recurring_templates_updated_at
BEFORE UPDATE ON public.recurring_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela credit_cards
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

-- RLS para credit_cards
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_cards' AND policyname = 'Users can view their own credit cards') THEN
    CREATE POLICY "Users can view their own credit cards" ON public.credit_cards FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_cards' AND policyname = 'Users can create their own credit cards') THEN
    CREATE POLICY "Users can create their own credit cards" ON public.credit_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_cards' AND policyname = 'Users can update their own credit cards') THEN
    CREATE POLICY "Users can update their own credit cards" ON public.credit_cards FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_cards' AND policyname = 'Users can delete their own credit cards') THEN
    CREATE POLICY "Users can delete their own credit cards" ON public.credit_cards FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger para credit_cards
DROP TRIGGER IF EXISTS update_credit_cards_updated_at ON public.credit_cards;
CREATE TRIGGER update_credit_cards_updated_at
BEFORE UPDATE ON public.credit_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela invoice_payments
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

-- RLS para invoice_payments
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_payments' AND policyname = 'Users can view their own invoice payments') THEN
    CREATE POLICY "Users can view their own invoice payments" ON public.invoice_payments FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_payments' AND policyname = 'Users can create their own invoice payments') THEN
    CREATE POLICY "Users can create their own invoice payments" ON public.invoice_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_payments' AND policyname = 'Users can update their own invoice payments') THEN
    CREATE POLICY "Users can update their own invoice payments" ON public.invoice_payments FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_payments' AND policyname = 'Users can delete their own invoice payments') THEN
    CREATE POLICY "Users can delete their own invoice payments" ON public.invoice_payments FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoice_payments_month ON public.invoice_payments(user_id, reference_month);

-- Trigger para invoice_payments
DROP TRIGGER IF EXISTS update_invoice_payments_updated_at ON public.invoice_payments;
CREATE TRIGGER update_invoice_payments_updated_at
BEFORE UPDATE ON public.invoice_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Log de progresso
DO $$ BEGIN
  RAISE NOTICE '✅ Tabelas base criadas com sucesso!';
END $$;

-- =====================================================
-- PARTE 2: ADICIONAR CARD_TYPE E PURCHASE_DATE
-- =====================================================

-- Adicionar card_type em credit_cards
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='credit_cards' AND column_name='card_type') THEN
    ALTER TABLE public.credit_cards ADD COLUMN card_type TEXT NOT NULL DEFAULT 'credit' CHECK (card_type IN ('prepaid', 'credit'));
    RAISE NOTICE '✅ Coluna card_type adicionada';
  ELSE
    RAISE NOTICE 'ℹ️  Coluna card_type já existe';
  END IF;
END $$;

COMMENT ON COLUMN public.credit_cards.card_type IS 'Type of card: "prepaid" (debit/prepaid, affects balance immediately) or "credit" (affects balance when invoice is paid)';

-- Adicionar purchase_date em financial_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_items' AND column_name='purchase_date') THEN
    ALTER TABLE public.financial_items ADD COLUMN purchase_date DATE;
    RAISE NOTICE '✅ Coluna purchase_date adicionada';
  ELSE
    RAISE NOTICE 'ℹ️  Coluna purchase_date já existe';
  END IF;
END $$;

COMMENT ON COLUMN public.financial_items.purchase_date IS 'Actual date of purchase (for credit cards). The "date" field represents when the transaction affects the balance (invoice month for credit cards)';

-- Índices
CREATE INDEX IF NOT EXISTS idx_financial_items_purchase_date ON public.financial_items(purchase_date) WHERE purchase_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credit_cards_card_type ON public.credit_cards(card_type, user_id) WHERE is_active = true;

-- Atualizar registros existentes
UPDATE public.financial_items
SET purchase_date = date
WHERE credit_card IS NOT NULL AND purchase_date IS NULL;

-- Log de progresso
DO $$ BEGIN
  RAISE NOTICE '✅ Colunas card_type e purchase_date adicionadas!';
END $$;

-- =====================================================
-- PARTE 3: FUNÇÕES ÚTEIS
-- =====================================================

-- Função para gerar recorrentes pendentes
CREATE OR REPLACE FUNCTION generate_pending_recurring_expenses(
  target_user_id UUID,
  target_month DATE
) RETURNS void AS $$
BEGIN
  INSERT INTO public.financial_items (
    user_id, date, type, amount, description, category,
    business_unit_id, credit_card, bank, source,
    is_recurring, recurring_template_id, recurring_status
  )
  SELECT
    rt.user_id, target_month, rt.type, rt.amount, rt.description, rt.category,
    rt.business_unit_id, rt.credit_card, COALESCE(rt.credit_card, 'N/A'), 'recurring_auto',
    true, rt.id, 'pending'
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
  SET last_generated_month = target_month, updated_at = now()
  WHERE user_id = target_user_id AND is_active = true
    AND (last_generated_month IS NULL OR last_generated_month < target_month);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar compra parcelada
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
  v_group_id := gen_random_uuid();
  v_installment_amount := ROUND(p_total_amount / p_total_installments, 2);

  FOR v_i IN 1..p_total_installments LOOP
    v_current_date := p_start_date + (v_i - 1) * INTERVAL '1 month';

    INSERT INTO public.financial_items (
      user_id, date, type, amount, description, category, credit_card, bank,
      business_unit_id, source, is_installment, installment_number, total_installments, installment_group_id
    ) VALUES (
      p_user_id, v_current_date, p_type, v_installment_amount,
      p_description || ' (' || v_i || '/' || p_total_installments || ')',
      p_category, p_credit_card, COALESCE(p_credit_card, 'N/A'),
      p_business_unit_id, 'installment', true, v_i, p_total_installments, v_group_id
    );
  END LOOP;

  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log de progresso
DO $$ BEGIN
  RAISE NOTICE '✅ Funções criadas!';
END $$;

-- =====================================================
-- PARTE 4: VIEW DE FATURAS
-- =====================================================

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
    cc.id, cc.user_id, cc.name, cc.due_day, cc.closing_day, cc.color, cc.card_type,
    DATE_TRUNC('month', fi.date)::DATE, ip.paid, ip.payment_date, ip.notes
ORDER BY reference_month DESC, card_name;

GRANT SELECT ON public.credit_card_invoices TO authenticated;
ALTER VIEW public.credit_card_invoices OWNER TO postgres;

-- Log de progresso
DO $$ BEGIN
  RAISE NOTICE '✅ View credit_card_invoices criada!';
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

DO $$
DECLARE
  tables_ok BOOLEAN;
  columns_ok BOOLEAN;
  view_ok BOOLEAN;
BEGIN
  -- Verificar tabelas
  SELECT COUNT(*) = 3 INTO tables_ok
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('credit_cards', 'recurring_templates', 'invoice_payments');

  -- Verificar colunas
  SELECT COUNT(*) = 2 INTO columns_ok
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND ((table_name = 'credit_cards' AND column_name = 'card_type')
    OR (table_name = 'financial_items' AND column_name = 'purchase_date'));

  -- Verificar view
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'credit_card_invoices'
  ) INTO view_ok;

  IF tables_ok AND columns_ok AND view_ok THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ========================================';
    RAISE NOTICE '🎉 MIGRATION CONCLUÍDA COM SUCESSO!';
    RAISE NOTICE '🎉 ========================================';
    RAISE NOTICE '✅ Tabelas criadas: credit_cards, recurring_templates, invoice_payments';
    RAISE NOTICE '✅ Colunas adicionadas: card_type, purchase_date';
    RAISE NOTICE '✅ View criada: credit_card_invoices';
    RAISE NOTICE '✅ Funções criadas: generate_pending_recurring_expenses, create_installment_purchase';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Próximos passos:';
    RAISE NOTICE '1. Abra seu app (localhost:8080)';
    RAISE NOTICE '2. Vá em Cartões de Crédito';
    RAISE NOTICE '3. Cadastre seus cartões com o tipo correto';
    RAISE NOTICE '4. Leia o arquivo CREDIT_CARDS_GUIDE.md para mais detalhes';
    RAISE NOTICE '';
  ELSE
    RAISE WARNING '⚠️  Alguns componentes podem estar faltando:';
    IF NOT tables_ok THEN
      RAISE WARNING '❌ Nem todas as tabelas foram criadas';
    END IF;
    IF NOT columns_ok THEN
      RAISE WARNING '❌ Nem todas as colunas foram adicionadas';
    END IF;
    IF NOT view_ok THEN
      RAISE WARNING '❌ View não foi criada';
    END IF;
  END IF;
END $$;
