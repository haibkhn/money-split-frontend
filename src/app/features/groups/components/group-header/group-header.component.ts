import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../../../services/group.service';
import { Group } from '../../../../models/types';
import { take } from 'rxjs/operators';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-group-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-header.component.html',
  styleUrls: ['./group-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupHeaderComponent implements OnInit {
  @Input() groupId: string = '';

  groupName: string = 'My Group';
  isEditing: boolean = false;
  totalExpenses: number = 0;
  memberCount: number = 0;
  groupCurrency: string = 'EUR';
  memberSpending: { name: string; amountSpent: number }[] = [];

  private groupService = inject(GroupService);
  group$ = this.groupService.currentGroup$;
  private cdr = inject(ChangeDetectorRef);
  private notificationService = inject(NotificationService);

  ngOnInit() {
    // Load group data when component initializes
    if (this.groupId) {
      this.groupService.loadGroup(this.groupId);
    }

    this.group$.subscribe((group: Group | null) => {
      if (!group) return; // Exit early if no group

      try {
        this.updateGroupData(group);
        this.cdr.markForCheck(); // Use markForCheck instead of detectChanges
      } catch (error) {
        console.error('Error processing group data:', error);
        this.notificationService.show('Error loading group data', 'error');
      }
    });
  }

  private updateGroupData(group: Group) {
    this.groupName = group.name || 'My Group';
    this.memberCount = group.members?.length || 0;
    this.groupCurrency = group.currency || 'EUR';

    // Calculate total expenses with proper number conversion
    this.totalExpenses = (group.expenses || []).reduce((sum, expense) => {
      const amount = Number(
        expense.convertedAmount || expense.totalAmount || 0
      );
      return Number((sum + amount).toFixed(2));
    }, 0);

    // Calculate each member's spending
    this.memberSpending = (group.members || []).map((member) => {
      const amountSpent = (group.expenses || []).reduce((sum, expense) => {
        // Find payments by this member
        const memberPayments = expense.payers.filter(
          (payer) => payer.member.id === member.id
        );

        // Sum up all payments
        const totalPaid = memberPayments.reduce((paymentSum, payer) => {
          return paymentSum + Number(payer.amount || 0);
        }, 0);

        return sum + totalPaid;
      }, 0);

      return {
        name: member.name,
        amountSpent: Number(amountSpent.toFixed(2)),
      };
    });

    // Debug logging
    // console.log('Member spending calculation:', {
    //   members: group.members,
    //   expenses: group.expenses,
    //   result: this.memberSpending,
    // });
  }

  toggleEditName() {
    this.isEditing = !this.isEditing;

    if (!this.isEditing) {
      this.group$.pipe(take(1)).subscribe((group) => {
        if (!group) return;

        this.groupService.saveGroup({
          ...group,
          name: this.groupName.trim() || 'My Group',
        });
      });
    }
  }

  shareGroup() {
    try {
      const url = window.location.href;
      navigator.clipboard.writeText(url).then(
        () => {
          this.notificationService.show('Group link copied to clipboard!');
        },
        () => {
          this.notificationService.show('Failed to copy link', 'error');
        }
      );
    } catch (error) {
      console.error('Error sharing group:', error);
      this.notificationService.show('Failed to share group', 'error');
    }
  }

  formatAmount(value: number | string | null): number {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return Number(isNaN(num) ? 0 : num.toFixed(2));
  }

  // Helper method to safely get member ID
  private getMemberId(payer: any): string | undefined {
    return payer?.memberId || payer?.member?.id;
  }

  // Check if amount is valid number
  isValidAmount(amount: any): boolean {
    const num = Number(amount);
    return !isNaN(num) && isFinite(num);
  }
}
