import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
import { GroupService } from '../../../../services/group.service';
import { Group, Member } from '../../../../models/types';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expense-list.component.html',
  styleUrls: ['./expense-list.component.scss'],
})
export class ExpenseListComponent {
  private groupService = inject(GroupService);
  group$ = this.groupService.currentGroup$;

  getMemberName(group: Group, memberId: string): string {
    return group.members.find((m) => m.id === memberId)?.name || 'Unknown';
  }

  getParticipantNames(
    group: Group,
    participants: Array<{ memberId: string }>
  ): string {
    if (participants.length === group.members.length) {
      return 'Everyone';
    }

    return participants
      .map((p) => this.getMemberName(group, p.memberId))
      .join(', ');
  }

  removeExpense(expenseId: string) {
    if (confirm('Are you sure you want to delete this expense?')) {
      this.group$.pipe(take(1)).subscribe((group) => {
        if (!group) return;
        this.groupService.removeExpense(expenseId);
      });
    }
  }

  isCurrencyDifferent(expense: any, groupCurrency: string): boolean {
    return expense.currency && expense.currency !== groupCurrency;
  }

  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  // Optional: Add this method if you want to show the exchange rate
  getExchangeRate(expense: any): string {
    if (expense.convertedAmount && expense.totalAmount) {
      const rate = expense.convertedAmount / expense.totalAmount;
      return `(1 ${expense.currency} = ${rate.toFixed(4)} ${
        expense.groupCurrency
      })`;
    }
    return '';
  }
}
