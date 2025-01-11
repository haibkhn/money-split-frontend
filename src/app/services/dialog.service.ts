import { Injectable, ViewContainerRef, Injector } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../features/groups/components/confirm-dialog/confirm-dialog.component';

export class DialogRef {
  private closeSubject = new Subject<boolean>();

  close(result: boolean) {
    this.closeSubject.next(result);
    this.closeSubject.complete();
  }

  afterClosed(): Promise<boolean> {
    return firstValueFrom(this.closeSubject);
  }
}

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private dialogContainer: ViewContainerRef | null = null;

  setContainer(container: ViewContainerRef) {
    this.dialogContainer = container;
  }

  async confirm(options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> {
    if (!this.dialogContainer) {
      console.error('Dialog container not set');
      return false;
    }

    const dialogRef = new DialogRef();

    const componentRef = this.dialogContainer.createComponent(
      ConfirmDialogComponent,
      {
        injector: Injector.create({
          providers: [{ provide: DialogRef, useValue: dialogRef }],
        }),
      }
    );

    Object.assign(componentRef.instance, options);

    // Clean up the component when dialog is closed
    const result = await dialogRef.afterClosed();
    componentRef.destroy();

    return result;
  }
}
