// models/types.ts
export interface Member {
  id: string;
  name: string;
  balance: number;
}

export interface Payer {
  memberId: string;
  amount: number;
}

export interface Participant {
  memberId: string;
  share: number;
}

export interface Currency {
  code: string;
  name: string;
}

export interface Expense {
  id: string;
  description: string;
  totalAmount: number;
  currency: string; // Currency used for this expense
  convertedAmount: number; // Amount in group's base currency
  payers: Payer[];
  participants: Participant[];
  date: string;
  splitType: 'equal' | 'custom';
}

export interface Group {
  id: string;
  name: string;
  currency: string; // Base currency for the group
  members: Member[];
  expenses: Expense[];
}
