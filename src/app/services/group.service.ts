import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Group, Member, Expense, CreateExpenseDto } from '../models/types';
import { BehaviorSubject, take, catchError, EMPTY, finalize } from 'rxjs';
import { NotificationService } from './notification.service';
import { environment } from '../../environment/environment';
import { isPlatformBrowser } from '@angular/common';
import { UrlService } from './url.service';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  private apiUrl = environment.apiUrl;
  private currentGroup = new BehaviorSubject<Group | null>(null);
  currentGroup$ = this.currentGroup.asObservable();
  private isLoading = false;
  private settlements = new BehaviorSubject<
    Array<{ from: string; to: string; amount: number }>
  >([]);
  settlements$ = this.settlements.asObservable();

  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private urlService = inject(UrlService);

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
    const encodedId = this.urlService.encodeId(groupId);

    this.http
      .get<Group>(`${this.apiUrl}/groups/${encodedId}`)
      .pipe(
        catchError((error) => {
          console.error('Error loading group:', error);
          this.notificationService.show('Failed to load group', 'error');
          return EMPTY;
        })
      )
      .subscribe((group) => {
        if (group) {
          group.members = group.members || [];
          group.expenses = group.expenses || [];
          this.currentGroup.next(group);

          // Calculate settlements whenever group is loaded
          const newSettlements = this.getSettlementSuggestions(group);
          this.settlements.next(newSettlements);
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

  addExpense(groupId: string, expense: CreateExpenseDto) {
    return this.http
      .post<Expense>(`${this.apiUrl}/expenses`, expense)
      .subscribe({
        next: () => {
          this.loadGroup(groupId); // Reload group after adding expense
        },
        error: (error) => {
          console.error('Error adding expense:', error);
          this.notificationService.show('Failed to add expense', 'error');
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
          this.loadGroup(group.id); // Reload entire group after removing expense
        });
      },
      error: (error) => {
        console.error('Error removing expense:', error);
        this.notificationService.show('Failed to remove expense', 'error');
      },
    });
  }

  // private calculateMemberBalances(
  //   members: Member[],
  //   expenses: Expense[]
  // ): Member[] {
  //   const updatedMembers = members.map((member) => ({
  //     ...member,
  //     balance: 0, // Start with 0 balance
  //   }));

  //   expenses.forEach((expense) => {
  //     // Add amounts paid
  //     expense.payers.forEach((payer) => {
  //       const member = updatedMembers.find((m) => m.id === payer.memberId);
  //       if (member) {
  //         // Convert string to number and add
  //         member.balance = Number(member.balance) + Number(payer.amount);
  //       }
  //     });

  //     // Subtract shares
  //     expense.participants.forEach((participant) => {
  //       const member = updatedMembers.find(
  //         (m) => m.id === participant.memberId
  //       );
  //       if (member) {
  //         // Convert string to number and subtract
  //         member.balance = Number(member.balance) - Number(participant.share);
  //       }
  //     });
  //   });

  //   // Round all balances to 2 decimal places before returning
  //   return updatedMembers.map((member) => ({
  //     ...member,
  //     balance: Number(Number(member.balance).toFixed(2)),
  //   }));
  // }

  getSettlementSuggestions(group: Group) {
    if (!group || !group.members) return [];

    // Make a copy of members to avoid modifying the original
    const members = group.members
      .map((m) => ({
        ...m,
        balance: Number(m.balance || 0),
      }))
      .sort((a, b) => a.balance - b.balance);

    const settlements: Array<{ from: string; to: string; amount: number }> = [];

    let i = 0;
    let j = members.length - 1;

    while (i < j) {
      const debtor = members[i];
      const creditor = members[j];

      // Skip members with zero balance
      if (Math.abs(debtor.balance) < 0.01) {
        i++;
        continue;
      }

      if (Math.abs(creditor.balance) < 0.01) {
        j--;
        continue;
      }

      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);

      if (amount > 0) {
        settlements.push({
          from: debtor.name,
          to: creditor.name,
          amount: Number(amount.toFixed(2)),
        });

        debtor.balance += amount;
        creditor.balance -= amount;
      }

      if (Math.abs(debtor.balance) < 0.01) i++;
      if (Math.abs(creditor.balance) < 0.01) j--;
    }

    return settlements;
  }

  // Add method to clear settlements when needed (like when adding a new expense)
  clearSettlements() {
    this.settlements.next([]);
  }
}
