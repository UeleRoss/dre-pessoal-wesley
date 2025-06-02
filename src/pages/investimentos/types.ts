
export interface Investment {
  id: string;
  name: string;
  category: string;
  initial_amount: number;
  current_balance: number;
  created_at: string;
}

export interface InvestmentTransaction {
  id: string;
  investment_id: string;
  type: 'aporte' | 'retirada';
  amount: number;
  bank?: string;
  description?: string;
  date: string;
  created_at: string;
  user_id: string;
}

export interface InvestmentForm {
  name: string;
  category: string;
  initial_amount: string;
  is_setup: boolean;
  source_bank: string;
}

export interface TransactionForm {
  type: 'aporte' | 'retirada';
  amount: string;
  bank: string;
  description: string;
  date: string;
}
