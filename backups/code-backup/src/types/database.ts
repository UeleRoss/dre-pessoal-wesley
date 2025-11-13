export interface Category {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface BankBalance {
  id: string;
  user_id: string;
  bank_name: string;
  baseline_date: string | null;
  initial_balance: number;
  created_at: string;
  updated_at: string;
}

export interface RecurringBill {
  id: string;
  user_id: string;
  name: string;
  value: number;
  due_date: number;
  category: string | null;
  bank: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringBillInstance {
  id: string;
  user_id: string;
  bill_id: string;
  month_reference: string;
  valor_ajustado: number | null;
  pago: boolean;
  created_at: string;
  updated_at: string;
}
