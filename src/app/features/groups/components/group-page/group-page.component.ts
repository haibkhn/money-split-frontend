import { Component, OnInit, inject, PLATFORM_ID, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UrlService } from '../../../../services/url.service';
import { GroupService } from '../../../../services/group.service';
import { CommonModule } from '@angular/common';
import { GroupHeaderComponent } from '../group-header/group-header.component';
import { MemberListComponent } from '../member-list/member-list.component';
import { ExpenseFormComponent } from '../expense-form/expense-form.component';
import { ExpenseListComponent } from '../expense-list/expense-list.component';
import { SettlementListComponent } from '../settlement-list/settlement-list.component';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-group-page',
  standalone: true,
  imports: [
    CommonModule,
    GroupHeaderComponent,
    MemberListComponent,
    ExpenseFormComponent,
    ExpenseListComponent,
    SettlementListComponent,
  ],
  templateUrl: './group-page.component.html',
  styleUrls: ['./group-page.component.scss'],
})
export class GroupPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private urlService = inject(UrlService);
  protected groupService = inject(GroupService);
  private platformId = inject(PLATFORM_ID);

  groupId: string = '';

  ngOnInit() {
    // Only load group data in browser environment
    if (isPlatformBrowser(this.platformId)) {
      this.route.params.subscribe((params) => {
        const shortId = params['groupId'];
        this.groupId = shortId;
        const fullId = this.urlService.decodeId(shortId);
        this.groupService.loadGroup(fullId);
      });
    }
  }
}
