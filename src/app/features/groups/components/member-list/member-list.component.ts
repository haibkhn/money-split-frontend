import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { GroupService } from '../../../../services/group.service';
import { take } from 'rxjs/operators';
import { DialogService } from '../../../../services/dialog.service';

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './member-list.component.html',
  styleUrls: ['./member-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberListComponent {
  private groupService = inject(GroupService);
  private cdr = inject(ChangeDetectorRef);
  private dialogService = inject(DialogService);

  group$ = this.groupService.currentGroup$;
  showAddMember = false;
  newMemberName = '';

  addMember() {
    if (this.newMemberName.trim()) {
      this.group$.pipe(take(1)).subscribe((group) => {
        if (group) {
          this.groupService.addMember(group.id, this.newMemberName);
          this.newMemberName = '';
          this.showAddMember = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  async removeMember(memberId: string) {
    const confirmed = await this.dialogService.confirm({
      title: 'Remove Member',
      message:
        'Are you sure you want to remove this member? This action cannot be undone.',
      confirmText: 'Remove',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      this.group$.pipe(take(1)).subscribe((group) => {
        if (group) {
          this.groupService.removeMember(group.id, memberId);
        }
      });
    }
  }

  cancelAdd() {
    this.showAddMember = false;
    this.newMemberName = '';
    this.cdr.detectChanges();
  }

  toggleAddMember() {
    this.showAddMember = true;
    this.cdr.detectChanges();
  }

  getBalanceClass(balance: number | null): string {
    if (balance === null || balance === undefined) return '';
    // Convert to number and round to 2 decimal places
    const roundedBalance = Number(Number(balance).toFixed(2));
    return roundedBalance > 0
      ? 'positive'
      : roundedBalance < 0
      ? 'negative'
      : '';
  }

  formatBalance(amount: number | null): number {
    if (amount === null || amount === undefined) return 0;
    // Convert to number and round to 2 decimal places
    return Number(Number(amount).toFixed(2));
  }
}
