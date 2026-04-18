export interface Account {
  id: string;
  account_type: string;
  account_number: string;
  balance: number;
  status: string;
  currency: string;
}

export interface Transfer {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string;
  status: string;
  reference_number: string;
  created_at: string;
}