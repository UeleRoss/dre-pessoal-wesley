import { BusinessUnit } from './business-unit';

export interface FinancialItem {
  id: string;
  created_at: string;
  date: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  bank: string;
  source: string | null;
  user_id: string;
  business_unit_id?: string | null;
  business_unit?: BusinessUnit;

  // Contas Recorrentes
  is_recurring?: boolean;
  recurring_template_id?: string | null;
  recurring_status?: 'pending' | 'approved' | 'skipped' | null;

  // Cartão de Crédito
  credit_card?: string | null;

  // Parcelamento
  is_installment?: boolean;
  installment_number?: number | null;
  total_installments?: number | null;
  installment_group_id?: string | null;
}

export interface FinancialSummary {
  id: string;
  created_at: string;
  month: string;
  category: string;
  total_value: number;
  user_id: string;
}

export interface IncomeSummary {
  id: string;
  created_at: string;
  month: string;
  source: string;
  total_value: number;
  user_id: string;
}

export interface RecurringTemplate {
  id: string;
  user_id: string;
  type: 'entrada' | 'saida';
  amount: number;
  description: string;
  category: string;
  business_unit_id: string | null;
  credit_card: string | null;
  is_active: boolean;
  last_generated_month: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  due_day: number;
  closing_day: number;
  credit_limit: number | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoicePayment {
  id: string;
  user_id: string;
  credit_card_id: string;
  reference_month: string;
  invoice_amount: number;
  paid: boolean;
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditCardInvoice {
  credit_card_id: string;
  user_id: string;
  card_name: string;
  due_day: number;
  color: string;
  reference_month: string;
  total_items: number;
  recurring_items: number;
  installment_items: number;
  total_amount: number;
  recurring_amount: number;
  installment_amount: number;
  is_paid: boolean;
  payment_date: string | null;
}

export interface UnitCategory {
  id: string;
  user_id: string;
  business_unit_id: string;
  type: 'entrada' | 'saida';
  name: string;
  created_at: string;
  updated_at: string;
}
