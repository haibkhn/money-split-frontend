import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
} from '@angular/core';
import { NotificationComponent } from '../features/groups/components/notification/notification.component';

export type NotificationType = 'success' | 'error' | 'info';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);

  show(message: string, type: NotificationType = 'info') {
    // Create component
    const componentRef = createComponent(NotificationComponent, {
      environmentInjector: this.injector,
    });

    // Set inputs
    componentRef.instance.message = message;
    componentRef.instance.type = type;
    componentRef.instance.onClose = () => {
      componentRef.destroy();
    };

    // Add to DOM
    document.body.appendChild(componentRef.location.nativeElement);
    this.appRef.attachView(componentRef.hostView);
  }
}
