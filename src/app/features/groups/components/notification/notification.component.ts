// notification.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification" [class]="type">
      <div class="content">{{ message }}</div>
      <button class="close-button" (click)="onClose()">×</button>
    </div>
  `,
  styles: [
    `
      .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 1rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        min-width: 300px;
        max-width: 400px;
        animation: slideIn 0.2s ease-out;

        &.success {
          background-color: #4caf50;
          color: white;
        }

        &.error {
          background-color: #ef4444;
          color: white;
        }

        &.info {
          background-color: #3b82f6;
          color: white;
        }

        .content {
          flex: 1;
          font-size: 0.95rem;
        }

        .close-button {
          background: none;
          border: none;
          color: currentColor;
          cursor: pointer;
          font-size: 1.5rem;
          padding: 0.2rem;
          opacity: 0.8;
          line-height: 1;

          &:hover {
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          bottom: 10px;
          right: 10px;
          left: 10px; // Make it stretch across screen width
          min-width: auto; // Remove min-width constraint
          max-width: none; // Remove max-width constraint
          padding: 0.75rem 1rem; // Slightly smaller padding

          .content {
            font-size: 0.9rem; // Slightly smaller font
          }

          .close-button {
            padding: 0.5rem; // Larger tap target for mobile
          }
        }
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `,
  ],
})
export class NotificationComponent implements OnInit {
  @Input() message: string = '';
  @Input() type: 'success' | 'error' | 'info' = 'info';
  @Input() onClose: () => void = () => {};

  ngOnInit() {
    // Auto close after 3 seconds
    setTimeout(() => {
      this.onClose();
    }, 3000);
  }
}
