import { Injectable } from '@angular/core';
import { Group, Member, Expense } from '../models/types';
import { BehaviorSubject, take } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  private currentGroup = new BehaviorSubject<Group | null>(null);
  currentGroup$ = this.currentGroup.asObservable();

  // Add a separate BehaviorSubject for settlements
  private settlements = new BehaviorSubject<
    Array<{ from: string; to: string; amount: number }>
  >([]);
  settlements$ = this.settlements.asObservable();

  createGroup(group: Group) {
    this.currentGroup.next(group);
    this.saveGroup(group);
  }

  loadGroup(groupId: string) {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Try to get existing group from localStorage
      const savedGroup = localStorage.getItem(`group_${groupId}`);

      if (savedGroup) {
        // If group exists in localStorage, load it
        this.currentGroup.next(JSON.parse(savedGroup));
      } else {
        // If no group exists, create new one
        const newGroup: Group = {
          id: groupId,
          name: 'New Group',
          currency: 'EUR',
          members: [],
          expenses: [],
        };

        this.currentGroup.next(newGroup);
        // Save the new group to localStorage
        localStorage.setItem(`group_${groupId}`, JSON.stringify(newGroup));
      }
    } else {
      // Fallback for non-browser environment
      const newGroup: Group = {
        id: groupId,
        name: 'New Group',
        currency: 'EUR',
        members: [],
        expenses: [],
      };

      this.currentGroup.next(newGroup);
    }
  }

  saveGroup(group: Group) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`group_${group.id}`, JSON.stringify(group));
    }
    this.currentGroup.next(group);
  }

  addMember(groupId: string, name: string) {
    this.currentGroup$.pipe(take(1)).subscribe((group) => {
      if (!group) return;

      const newMember: Member = {
        id: Date.now().toString(),
        name,
        balance: 0,
      };

      const updatedGroup = {
        ...group,
        members: [...group.members, newMember],
      };

      // Update group but don't recalculate settlements
      this.currentGroup.next(updatedGroup);

      // Persist the updated group
      this.saveGroup(updatedGroup);
      // Keep existing settlements
      const currentSettlements = this.settlements.getValue();
      if (currentSettlements.length > 0) {
        this.settlements.next(currentSettlements);
      }
    });
  }

  addExpense(groupId: string, expense: Expense) {
    this.currentGroup$.pipe(take(1)).subscribe((group) => {
      if (!group) return;

      // Deep copy of members to calculate new balances
      const updatedMembers = group.members.map((member) => {
        // Calculate what they paid (in group's currency)
        const amountPaid = expense.payers
          .filter((payer) => payer.memberId === member.id)
          .reduce((sum, payer) => sum + payer.amount, 0);

        // Calculate what they owe (in group's currency)
        const share =
          expense.participants.find((p) => p.memberId === member.id)?.share ||
          0;

        // Calculate new balance
        return {
          ...member,
          // Add what they paid, subtract what they owe
          balance: (member.balance || 0) + amountPaid - share,
        };
      });

      const updatedGroup = {
        ...group,
        expenses: [...group.expenses, expense],
        members: updatedMembers,
      };

      // Save and update the group
      this.saveGroup(updatedGroup);

      // Clear existing settlements and recalculate
      const newSettlements = this.getSettlementSuggestions(updatedGroup);
      this.settlements.next(newSettlements);
    });
  }

  removeMember(groupId: string, memberId: string) {
    this.currentGroup$.pipe(take(1)).subscribe((group) => {
      if (!group) return;

      // Check if member has any expenses as a payer or participant
      const hasExpensesAsPayer = group.expenses.some((expense) =>
        expense.payers.some((payer) => payer.memberId === memberId)
      );

      const hasExpensesAsParticipant = group.expenses.some((expense) =>
        expense.participants.some(
          (participant) => participant.memberId === memberId
        )
      );

      if (hasExpensesAsPayer || hasExpensesAsParticipant) {
        alert('Cannot remove member who is involved in existing expenses.');
        return;
      }

      const updatedGroup = {
        ...group,
        members: group.members.filter((m) => m.id !== memberId),
      };

      this.saveGroup(updatedGroup);
    });
  }

  removeExpense(expenseId: string) {
    this.currentGroup$.pipe(take(1)).subscribe((group) => {
      if (!group) return;

      // Remove the expense
      const updatedExpenses = group.expenses.filter((e) => e.id !== expenseId);

      // Create a copy of the group with updated expenses
      const updatedGroup: Group = {
        ...group,
        expenses: updatedExpenses,
      };

      // Recalculate balances
      this.calculateBalances(updatedGroup);

      // Recalculate settlement suggestions
      const newSettlements = this.getSettlementSuggestions(updatedGroup);

      // Update the group and settlements
      this.currentGroup.next(updatedGroup);
      this.settlements.next(newSettlements);
    });
  }

  calculateBalances(group: Group): void {
    // Reset all balances
    const updatedMembers = group.members.map((member) => ({
      ...member,
      balance: 0,
    }));

    // Recalculate all balances from expenses
    group.expenses.forEach((expense) => {
      updatedMembers.forEach((member) => {
        // Add what they paid
        const amountPaid = expense.payers
          .filter((payer) => payer.memberId === member.id)
          .reduce((sum, payer) => sum + payer.amount, 0);

        // Subtract what they owe
        const share =
          expense.participants.find((p) => p.memberId === member.id)?.share ||
          0;

        member.balance = member.balance + amountPaid - share;
      });
    });

    // Update the group with new balances
    const updatedGroup = {
      ...group,
      members: updatedMembers,
    };

    this.currentGroup.next(updatedGroup);
  }

  // Add a method to get settlement suggestions
  getSettlementSuggestions(
    group: Group
  ): Array<{ from: string; to: string; amount: number }> {
    // Make a copy of members to avoid modifying the original balances
    const membersCopy = group.members.map((m) => ({ ...m }));

    const settlements: Array<{ from: string; to: string; amount: number }> = [];
    const debtors = membersCopy
      .filter((m) => m.balance < 0)
      .sort((a, b) => a.balance - b.balance);
    const creditors = membersCopy
      .filter((m) => m.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    while (debtors.length > 0 && creditors.length > 0) {
      const debtor = debtors[0];
      const creditor = creditors[0];

      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);

      if (amount > 0.01) {
        settlements.push({
          from: debtor.id,
          to: creditor.id,
          amount: Math.round(amount * 100) / 100,
        });
      }

      debtor.balance += amount;
      creditor.balance -= amount;

      if (Math.abs(debtor.balance) < 0.01) debtors.shift();
      if (Math.abs(creditor.balance) < 0.01) creditors.shift();
    }

    this.settlements.next(settlements); // Emit updated settlements
    return settlements;
  }

  // Add method to clear settlements when needed (like when adding a new expense)
  clearSettlements() {
    this.settlements.next([]);
  }
}