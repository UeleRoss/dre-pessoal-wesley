-- =====================================================
-- Migration: Corrigir View de Faturas de Cartão
-- Data: 2025-10-16
-- Descrição: Corrige a view credit_card_invoices para mostrar apenas faturas com lançamentos
-- =====================================================

-- Recriar a view para filtrar apenas cartões com lançamentos no mês
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
INNER JOIN public.financial_items fi ON fi.credit_card = cc.name
  AND fi.user_id = cc.user_id
  AND fi.type = 'saida'
LEFT JOIN public.invoice_payments ip ON ip.credit_card_id = cc.id
  AND ip.reference_month = DATE_TRUNC('month', fi.date)::DATE
WHERE cc.is_active = true
GROUP BY cc.id, cc.user_id, cc.name, cc.due_day, cc.color,
         DATE_TRUNC('month', fi.date)::DATE, ip.paid, ip.payment_date
HAVING COUNT(DISTINCT fi.id) > 0
ORDER BY reference_month DESC NULLS LAST, cc.name;

COMMENT ON VIEW credit_card_invoices IS 'View consolidada com faturas de cada cartão por mês (apenas meses com lançamentos)';
