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
    this.group$.subscribe((group: Group | null) => {
      if (group) {
        this.groupName = group.name;
        this.memberCount = group.members.length;
        this.groupCurrency = group.currency;

        // Calculate total expenses
        this.totalExpenses = group.expenses.reduce(
          (sum, expense) =>
            sum + (expense.convertedAmount || expense.totalAmount),
          0
        );

        // Calculate each member's spending
        this.memberSpending = group.members.map((member) => {
          const amountSpent = group.expenses
            .filter((expense) =>
              expense.payers.some((payer) => payer.memberId === member.id)
            )
            .reduce((sum, expense) => {
              const payer = expense.payers.find(
                (payer) => payer.memberId === member.id
              );
              return sum + (payer?.amount || 0);
            }, 0);

          return { name: member.name, amountSpent };
        });

        this.cdr.detectChanges();
      }
    });
  }

  toggleEditName() {
    this.isEditing = !this.isEditing;

    if (!this.isEditing) {
      this.groupService.currentGroup$.pipe(take(1)).subscribe((group) => {
        if (group) {
          this.groupService.saveGroup({ ...group, name: this.groupName });
        }
      });
    }
  }

  shareGroup() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.notificationService.show('Group link copied to clipboard!');
    });
  }
}
