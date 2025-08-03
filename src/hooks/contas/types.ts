export interface RecurringBill {
  id: string;
  name: string;
  value: number;
  due_date: number;
  category: string;
  bank: string;
  recurring: boolean;
  paid_this_month: boolean;
}

export interface BillAdjustment {
  id: string;
  bill_id: string;
  month: string;
  adjusted_value: number;
  user_id: string;
}

export interface BillInstance {
  id: string;
  bill_id: string;
  month_reference: string;
  valor_ajustado: number | null;
  pago: boolean;
  user_id: string;
}

export interface BillWithMonthlyData extends RecurringBill {
  paid_this_month: boolean;
  current_value: number;
}