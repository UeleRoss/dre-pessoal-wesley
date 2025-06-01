
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

export interface BillFormProps {
  editingBill: RecurringBill | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export interface BillFormData {
  name: string;
  value: string;
  due_date: string;
  category: string;
  bank: string;
  recurring: boolean;
}
