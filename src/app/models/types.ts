export interface Member {
  id: string;
  name: string;
  balance: number;
  groupId: string;
}

export interface Payer {
  id: string;
  amount: number;
  member: Member;
}

export interface Participant {
  id: string;
  share: number;
  member: Member;
}

export interface Currency {
  code: string;
  name: string;
}

export interface Expense {
  id: string;
  description: string;
  totalAmount: number;
  currency: string;
  convertedAmount: number;
  payers: Payer[];
  participants: Participant[];
  date: string;
  splitType?: 'equal' | 'custom';
  groupId: string;
}

export interface Group {
  id: string;
  name: string;
  currency: string; // Base currency for the group
  members: Member[];
  expenses: Expense[];
}

export interface PayerDto {
  memberId: string;
  amount: number;
}

export interface ParticipantDto {
  memberId: string;
  share: number;
}

export interface CreateExpenseDto {
  description: string;
  totalAmount: number;
  currency: string;
  convertedAmount: number;
  payers: PayerDto[];
  participants: ParticipantDto[];
  date: string;
  splitType?: 'equal' | 'custom';
  groupId: string;
}
