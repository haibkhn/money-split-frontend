import { Routes } from '@angular/router';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { GroupPageComponent } from './features/groups/components/group-page/group-page.component';
import { CreateGroupComponent } from './features/groups/components/create-group/create-group.component';

export const routes: Routes = [
  { path: '', component: CreateGroupComponent },
  { path: 'g/:groupId', component: GroupPageComponent },
];
