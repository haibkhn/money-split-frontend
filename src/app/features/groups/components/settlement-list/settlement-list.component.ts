import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
import { GroupService } from '../../../../services/group.service';
import { Group } from '../../../../models/types';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-settlement-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settlement-list.component.html',
  styleUrls: ['./settlement-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettlementListComponent {
  private groupService = inject(GroupService);
  private cdr = inject(ChangeDetectorRef);

  group$ = this.groupService.currentGroup$;
  settlements$ = this.groupService.settlements$;

  ngOnInit() {
    // Debug logging
    // this.settlements$.subscribe((settlements) => {
    //   console.log('Settlements:', settlements);
    // });
  }

  getMemberName(group: Group, memberIdOrName: string): string {
    if (!group || !group.members) {
      console.warn('No group or members available');
      return 'Unknown';
    }

    // First try to find by ID
    const memberById = group.members.find((m) => m.id === memberIdOrName);
    if (memberById) {
      return memberById.name;
    }

    // If not found by ID, try to find by name
    const memberByName = group.members.find((m) => m.name === memberIdOrName);
    if (memberByName) {
      return memberByName.name;
    }

    console.warn(`Member not found: ${memberIdOrName}`, {
      memberIdOrName,
      availableMembers: group.members.map((m) => ({
        id: m.id,
        name: m.name,
      })),
    });
    return 'Unknown';
  }

  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}
