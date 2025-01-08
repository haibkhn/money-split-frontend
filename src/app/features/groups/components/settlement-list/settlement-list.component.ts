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

  getMemberName(group: Group, memberId: string): string {
    return group.members.find((m) => m.id === memberId)?.name || 'Unknown';
  }
}
