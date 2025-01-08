import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { GroupHeaderComponent } from '../group-header/group-header.component';
import { MemberListComponent } from '../member-list/member-list.component';
import { GroupService } from '../../../../services/group.service';
import { ExpenseFormComponent } from '../expense-form/expense-form.component';
import { ExpenseListComponent } from '../expense-list/expense-list.component';
import { SettlementListComponent } from '../settlement-list/settlement-list.component';

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
  groupId: string = '';
  private route = inject(ActivatedRoute);
  private groupService = inject(GroupService);

  ngOnInit() {
    // Load group when component initializes
    this.route.params.subscribe((params) => {
      const groupId = params['groupId'];
      if (groupId) {
        this.groupService.loadGroup(groupId);
      }
    });
  }
}
