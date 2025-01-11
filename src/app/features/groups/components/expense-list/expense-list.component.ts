import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
import { GroupService } from '../../../../services/group.service';
import { Group, Member } from '../../../../models/types';
import { take } from 'rxjs/operators';
import { DialogService } from '../../../../services/dialog.service';

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
  private dialogService = inject(DialogService);

  getMemberName(group: Group, payer: any): string {
    if (!payer) {
      console.warn('No payer provided');
      return 'Unknown';
    }

    // Check if we have a memberId directly or nested in member object
    const memberId = payer.memberId || (payer.member && payer.member.id);

    if (!memberId) {
      console.warn('No memberId found in payer', payer);
      return 'Unknown';
    }

    if (!group || !group.members) {
      console.warn('No group or members available');
      return 'Unknown';
    }

    const member = group.members.find((m) => m.id === memberId);
    if (!member) {
      console.warn(`Member not found for ID: ${memberId}`, {
        memberId,
        availableMembers: group.members.map((m) => ({
          id: m.id,
          name: m.name,
        })),
      });
      return 'Unknown';
    }

    return member.name;
  }

  getParticipantNames(group: Group, participants: any[]): string {
    if (!participants || participants.length === 0) {
      return 'No participants';
    }

    if (!group || !group.members) {
      return 'Unknown';
    }

    if (participants.length === group.members.length) {
      return 'Everyone';
    }

    const names = participants
      .map((p) => {
        const memberId = p.memberId || (p.member && p.member.id);
        return this.getMemberName(group, { memberId });
      })
      .filter((name) => name !== 'Unknown');

    return names.length > 0 ? names.join(', ') : 'Unknown participants';
  }

  async removeExpense(expenseId: string) {
    const confirmed = await this.dialogService.confirm({
      title: 'Remove Expense',
      message:
        'Are you sure you want to delete this expense? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      this.group$.pipe(take(1)).subscribe((group) => {
        if (!group) return;
        this.groupService.removeExpense(expenseId);
      });
    }
  }

  isCurrencyDifferent(expense: any, groupCurrency: string): boolean {
    return expense.currency && expense.currency !== groupCurrency;
  }

  formatAmount(amount: number | null | undefined, currency: string): string {
    if (amount == null) return 'N/A';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  getExchangeRate(expense: any, groupCurrency: string): string {
    if (expense.convertedAmount && expense.totalAmount) {
      const rate = expense.convertedAmount / expense.totalAmount;
      return `(1 ${expense.currency} = ${rate.toFixed(4)} ${groupCurrency})`;
    }
    return '';
  }
}
