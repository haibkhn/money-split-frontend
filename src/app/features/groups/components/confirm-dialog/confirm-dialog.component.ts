import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { DialogRef } from '../../../../services/dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overlay" (click)="close()">
      <div class="dialog" (click)="$event.stopPropagation()">
        <h2>{{ title }}</h2>
        <p>{{ message }}</p>
        <div class="button-group">
          <button class="confirm" (click)="confirm()">{{ confirmText }}</button>
          <button class="cancel" (click)="close()">{{ cancelText }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .dialog {
        background: white;
        padding: 24px;
        border-radius: 8px;
        min-width: 300px;
        max-width: 90%;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }

      h2 {
        margin: 0 0 16px;
        color: #333;
      }

      p {
        margin: 0 0 24px;
        color: #666;
      }

      .button-group {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      button {
        padding: 8px 16px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        font-weight: 500;
      }

      .confirm {
        background: #dc2626;
        color: white;
      }

      .confirm:hover {
        background: #b91c1c;
      }

      .cancel {
        background: #e5e7eb;
        color: #374151;
      }

      .cancel:hover {
        background: #d1d5db;
      }

      /* Mobile styles */
      @media (max-width: 640px) {
        .dialog {
          padding: 20px;
          margin: 16px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .button-group {
          flex-direction: column-reverse;
          gap: 8px;
        }

        button {
          width: 100%;
          padding: 14px 20px;
        }

        h2 {
          font-size: 1.1rem;
        }

        p {
          font-size: 0.95rem;
          margin-bottom: 20px;
        }
      }

      /* Small screen adjustments */
      @media (max-height: 500px) {
        .dialog {
          margin: 8px;
          padding: 16px;
        }

        h2 {
          margin-bottom: 12px;
        }

        p {
          margin-bottom: 16px;
        }

        button {
          padding: 10px 16px;
        }
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure?';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';

  dialogRef = inject(DialogRef);

  confirm() {
    this.dialogRef.close(true);
  }

  close() {
    this.dialogRef.close(false);
  }
}
