import { Routes } from '@angular/router';
import { CreateGroupComponent } from './features/groups/components/create-group/create-group.component';
import { GroupPageComponent } from './features/groups/components/group-page/group-page.component';

export const routes: Routes = [
  { path: '', component: CreateGroupComponent },
  { path: 'g/:groupId', component: GroupPageComponent },
];
