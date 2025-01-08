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

  removeMember(memberId: string) {
    if (confirm('Are you sure you want to remove this member?')) {
      this.group$.pipe(take(1)).subscribe((group) => {
        if (group) {
          this.groupService.removeMember(group.id, memberId);
          this.cdr.detectChanges();
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

  getBalanceClass(balance: number): string {
    return balance > 0 ? 'positive' : balance < 0 ? 'negative' : '';
  }
}
