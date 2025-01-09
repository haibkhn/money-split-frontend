import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Group, Member, Expense } from '../models/types';
import { BehaviorSubject, take, catchError, EMPTY } from 'rxjs';
import { NotificationService } from './notification.service';
import { environment } from '../../environment/environment';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  private apiUrl = environment.apiUrl;
  private currentGroup = new BehaviorSubject<Group | null>(null);
  currentGroup$ = this.currentGroup.asObservable();
  private settlements = new BehaviorSubject<
    Array<{ from: string; to: string; amount: number }>
  >([]);
  settlements$ = this.settlements.asObservable();

  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);

  // Create group now makes an HTTP POST request
  createGroup(group: Group) {
    return this.http
      .post<Group>(`${this.apiUrl}/groups`, group)
      .pipe(
        catchError((error) => {
          console.error('Error creating group:', error);
          if (isPlatformBrowser(this.platformId)) {
            this.notificationService.show('Failed to create group', 'error');
          }
          return EMPTY;
        })
      )
      .subscribe((createdGroup) => {
        if (createdGroup) {
          // Ensure members and expenses arrays exist
          createdGroup.members = [];
          createdGroup.expenses = [];

          this.currentGroup.next(createdGroup);
          if (isPlatformBrowser(this.platformId)) {
            this.notificationService.show('Group created successfully');
          }
        }
      });
  }

  // Load group now fetches from the backend
  loadGroup(groupId: string) {
    this.http
      .get<Group>(`${this.apiUrl}/groups/${groupId}`)
      .pipe(
        catchError((error) => {
          console.error('Error loading group:', error);
          if (isPlatformBrowser(this.platformId)) {
            this.notificationService.show('Failed to load group', 'error');
          }
          return EMPTY;
        })
      )
      .subscribe((group) => {
        if (group) {
          // Ensure members and expenses arrays exist
          group.members = group.members || [];
          group.expenses = group.expenses || [];

          this.currentGroup.next(group);
          const newSettlements = this.getSettlementSuggestions(group);
          this.settlements.next(newSettlements);

          if (isPlatformBrowser(this.platformId)) {
            this.notificationService.show('Group loaded successfully');
          }
        } else {
          this.currentGroup.next(null);
          this.settlements.next([]);
          if (isPlatformBrowser(this.platformId)) {
            this.notificationService.show('Group not found', 'error');
          }
        }
      });
  }

  // Save group now updates the backend
  saveGroup(group: Group) {
    this.http
      .patch<Group>(`${this.apiUrl}/groups/${group.id}`, group)
      .subscribe({
        next: (updatedGroup) => {
          this.currentGroup.next(updatedGroup);
          if (isPlatformBrowser(this.platformId)) {
            this.notificationService.show('Group updated successfully');
          }
        },
        error: (error) => {
          if (isPlatformBrowser(this.platformId)) {
            this.notificationService.show('Failed to update group', 'error');
          }
          console.error('Error updating group:', error);
        },
      });
  }

  addMember(groupId: string, name: string) {
    return this.http
      .post<Member>(`${this.apiUrl}/members`, { name, groupId })
      .subscribe({
        next: (newMember) => {
          this.currentGroup$.pipe(take(1)).subscribe((group) => {
            if (!group) return;
            const updatedGroup = {
              ...group,
              members: [...group.members, newMember],
            };
            this.currentGroup.next(updatedGroup);
            if (isPlatformBrowser(this.platformId)) {
              this.notificationService.show('Member added successfully');
            }
          });
        },
        error: (error) => {
          if (isPlatformBrowser(this.platformId)) {
            this.notificationService.show('Failed to add member', 'error');
          }
          console.error('Error adding member:', error);
        },
      });
  }

  addExpense(groupId: string, expense: Expense) {
    return this.http
      .post<Expense>(`${this.apiUrl}/expenses`, { ...expense, groupId })
      .subscribe({
        next: (newExpense) => {
          this.currentGroup$.pipe(take(1)).subscribe((group) => {
            if (!group) return;

            // Update members' balances with new expense
            const updatedMembers = this.calculateMemberBalances(group.members, [
              newExpense,
            ]);

            const updatedGroup = {
              ...group,
              expenses: [...group.expenses, newExpense],
              members: updatedMembers,
            };

            this.currentGroup.next(updatedGroup);
            const newSettlements = this.getSettlementSuggestions(updatedGroup);
            this.settlements.next(newSettlements);
          });
        },
        error: (error) => {
          this.notificationService.show('Failed to add expense', 'error');
          console.error('Error adding expense:', error);
        },
      });
  }

  removeMember(groupId: string, memberId: string) {
    return this.http.delete(`${this.apiUrl}/members/${memberId}`).subscribe({
      next: () => {
        this.currentGroup$.pipe(take(1)).subscribe((group) => {
          if (!group) return;
          const updatedGroup = {
            ...group,
            members: group.members.filter((m) => m.id !== memberId),
          };
          this.currentGroup.next(updatedGroup);
        });
      },
      error: (error) => {
        if (error.status === 400) {
          this.notificationService.show(
            'Cannot remove member who is involved in existing expenses.',
            'error'
          );
        } else {
          this.notificationService.show('Failed to remove member', 'error');
        }
        console.error('Error removing member:', error);
      },
    });
  }

  removeExpense(expenseId: string) {
    return this.http.delete(`${this.apiUrl}/expenses/${expenseId}`).subscribe({
      next: () => {
        this.currentGroup$.pipe(take(1)).subscribe((group) => {
          if (!group) return;

          const updatedExpenses = group.expenses.filter(
            (e) => e.id !== expenseId
          );
          const updatedMembers = this.calculateMemberBalances(
            group.members.map((m) => ({ ...m, balance: 0 })),
            updatedExpenses
          );

          const updatedGroup = {
            ...group,
            expenses: updatedExpenses,
            members: updatedMembers,
          };

          this.currentGroup.next(updatedGroup);
          const newSettlements = this.getSettlementSuggestions(updatedGroup);
          this.settlements.next(newSettlements);
        });
      },
      error: (error) => {
        this.notificationService.show('Failed to remove expense', 'error');
        console.error('Error removing expense:', error);
      },
    });
  }

  private calculateMemberBalances(
    members: Member[],
    expenses: Expense[]
  ): Member[] {
    const updatedMembers = members.map((m) => ({ ...m, balance: 0 }));

    expenses.forEach((expense) => {
      updatedMembers.forEach((member) => {
        const amountPaid = expense.payers
          .filter((payer) => payer.memberId === member.id)
          .reduce((sum, payer) => sum + payer.amount, 0);

        const share =
          expense.participants.find((p) => p.memberId === member.id)?.share ||
          0;

        member.balance += amountPaid - share;
      });
    });

    return updatedMembers;
  }

  // Add a method to get settlement suggestions
  getSettlementSuggestions(
    group: Group
  ): Array<{ from: string; to: string; amount: number }> {
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

    return settlements;
  }

  // Add method to clear settlements when needed (like when adding a new expense)
  clearSettlements() {
    this.settlements.next([]);
  }
}
