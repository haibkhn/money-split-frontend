import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { GroupService } from '../../../../services/group.service';
import { take } from 'rxjs';
import { CreateExpenseDto, Currency } from '../../../../models/types';
import { CurrencyService } from '../../../../services/currency.service';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-form.component.html',
  styleUrls: ['./expense-form.component.scss'],
})
export class ExpenseFormComponent {
  [x: string]: any;
  private groupService = inject(GroupService);
  private currencyService = inject(CurrencyService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private notificationService = inject(NotificationService);

  group$ = this.groupService.currentGroup$;
  currencies: Currency[] = [];
  isLoading = false;

  displayAmount: string = '';

  expense = {
    description: '',
    totalAmount: 0,
    currency: 'EUR', // Default currency
    convertedAmount: 0,
    payers: [{ memberId: '', amount: 0 }],
    participants: [] as Array<{ memberId: string; share: number }>,
    date: new Date().toISOString().split('T')[0],
    splitType: 'equal' as 'equal' | 'custom',
  };

  showForm = false;
  isMultiplePayers = false;
  includeEveryone = true;

  ngOnInit() {
    this.loadCurrencies();
    this.initializeGroup();
  }

  loadCurrencies() {
    this.isLoading = true;
    this.currencyService.getAvailableCurrencies().subscribe({
      next: (currencies) => {
        this.currencies = currencies;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load currencies:', err);
        this.isLoading = false;
      },
    });
  }

  initializeGroup() {
    this.group$.subscribe((group) => {
      if (group) {
        // Set the default currency to the group's currency
        this.expense.currency = group.currency;

        if (this.includeEveryone) {
          this.expense.participants = group.members.map((member) => ({
            memberId: member.id,
            share: this.expense.totalAmount / group.members.length,
          }));
        }

        // Set default payer if `payers` array is empty or has no `memberId`
        if (
          group.members.length > 0 &&
          this.expense.payers[0].memberId === ''
        ) {
          this.expense.payers[0].memberId = group.members[0].id;
        }
      }
    });
  }

  constructor() {
    // Subscribe to group changes to dynamically handle new members
    this.group$.subscribe((group) => {
      if (group && this.includeEveryone) {
        this.expense.participants = group.members.map((member) => ({
          memberId: member.id,
          share: this.expense.totalAmount / group.members.length,
        }));
      }
    });
  }

  addPayer() {
    this.expense.payers.push({ memberId: '', amount: 0 });
  }

  removePayer(index: number) {
    this.expense.payers.splice(index, 1);
  }

  updatePayerAmount() {
    const amount = this.parseNumber(this.displayAmount);
    this.expense.totalAmount = amount;

    if (this.expense.payers.length > 0) {
      const equalAmount = amount / this.expense.payers.length;
      this.expense.payers.forEach((payer) => {
        payer.amount = equalAmount;
      });
    }
  }

  toggleParticipant(memberId: string) {
    const index = this.expense.participants.findIndex(
      (p) => p.memberId === memberId
    );
    if (index === -1) {
      this.expense.participants.push({ memberId, share: 0 });
    } else {
      this.expense.participants.splice(index, 1);
    }
    this.updateParticipantShares();
    // console.log('Participants after toggle:', this.expense.participants);
  }

  updateParticipantShares() {
    if (
      this.expense.splitType === 'equal' &&
      this.expense.participants.length > 0
    ) {
      // Ensure we're working with numbers
      const totalAmount = Number(this.expense.convertedAmount);
      const perPersonShare = totalAmount / this.expense.participants.length;

      this.expense.participants.forEach((participant) => {
        participant.share = Number(perPersonShare.toFixed(2)); // Round to 2 decimal places
      });
    }
  }

  toggleIncludeEveryone() {
    if (!this.includeEveryone && this.expense.participants.length > 0) {
      const confirmReset = window.confirm(
        'Switching to "Include Everyone" will reset your participant selections. Proceed?'
      );
      if (!confirmReset) {
        return;
      }
    }
    this.includeEveryone = !this.includeEveryone;
    if (this.includeEveryone) {
      this.group$.pipe(take(1)).subscribe((group) => {
        this.expense.participants = group!.members.map((member) => ({
          memberId: member.id,
          share: this.expense.totalAmount / group!.members.length,
        }));
      });
    }
  }

  async addExpense() {
    this.group$.pipe(take(1)).subscribe(async (group) => {
      if (!group) return;

      try {
        const newExpense: CreateExpenseDto = {
          description: this.expense.description,
          totalAmount: this.expense.totalAmount,
          currency: this.expense.currency,
          convertedAmount: this.expense.convertedAmount,
          payers: this.expense.payers,
          participants: this.expense.participants,
          date: this.expense.date,
          splitType: this.expense.splitType,
          groupId: group.id,
        };

        this.groupService.addExpense(group.id, newExpense);

        setTimeout(() => {
          this.resetForm();
          this.showForm = false;
        });
      } catch (error) {
        console.error('Error adding expense:', error);
        this.notificationService.show(
          'Failed to add expense. Please try again.'
        );
      }
    });
  }

  // Update reset form to include currency
  resetForm() {
    this.group$.pipe(take(1)).subscribe((group) => {
      this.expense = {
        description: '',
        totalAmount: 0,
        currency: group?.currency || 'EUR', // Use group's currency or fallback to 'EUR'
        convertedAmount: 0,
        payers: [{ memberId: '', amount: 0 }],
        participants: [],
        date: new Date().toISOString().split('T')[0],
        splitType: 'equal',
      };
      this.displayAmount = '';
      this.showForm = false;
      this.isMultiplePayers = false;
      this.includeEveryone = true;
    });
  }

  isParticipantSelected(memberId: string): boolean {
    return this.expense.participants.some((p) => p.memberId === memberId);
  }

  async updateAmountAndShares() {
    if (this.expense.totalAmount <= 0) return;

    this.group$.pipe(take(1)).subscribe(async (group) => {
      if (!group) return;

      try {
        // Only convert if currencies are different
        if (this.expense.currency !== group.currency) {
          const converted = await this.currencyService
            .convertCurrency(
              this.expense.totalAmount,
              this.expense.currency,
              group.currency
            )
            .toPromise();

          this.expense.convertedAmount = converted ?? this.expense.totalAmount;
        } else {
          this.expense.convertedAmount = this.expense.totalAmount;
        }

        // The condition we're checking
        if (this.expense.payers.length > 0 && this.expense.payers[0].memberId) {
          // console.log('Updating payer amounts');
          const equalAmount =
            this.expense.convertedAmount / this.expense.payers.length;
          this.expense.payers.forEach((payer) => {
            payer.amount = equalAmount;
          });
          // console.log('Payer Amounts updated:', this.expense.payers);
        } else {
          console.log('Skipping payer amount update because:', {
            'has payers': this.expense.payers.length > 0,
            'has valid memberId': Boolean(this.expense.payers[0]?.memberId),
          });
        }

        // Update participant shares only if we have participants
        if (this.includeEveryone) {
          // If everyone is included, add all members as participants
          this.expense.participants = group.members.map((member) => ({
            memberId: member.id,
            share: this.expense.convertedAmount / group.members.length,
          }));
        } else if (this.expense.participants.length > 0) {
          const equalShare =
            this.expense.convertedAmount / this.expense.participants.length;
          this.expense.participants.forEach((participant) => {
            participant.share = equalShare;
          });
        }
        // console.log('Participant Shares:', this.expense.participants);

        this.cdr.detectChanges();
      } catch (error) {
        console.error('Currency conversion failed:', error);
      }
    });
  }

  // For display in the input
  // Helper function to format numbers with commas
  formatNumber(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  // For parsing the input value
  parseNumber(value: string): number {
    return Number(value.replace(/,/g, ''));
  }

  onAmountInput(event: Event) {
    const input = event.target as HTMLInputElement;

    // Remove any non-numeric characters except decimal point
    const rawValue = input.value.replace(/[^\d.]/g, '');

    // Parse the value as a float for calculations
    const numericValue = parseFloat(rawValue) || 0;
    this.expense.totalAmount = numericValue;

    // Format the value with commas for display
    input.value = this.formatNumber(numericValue);

    // Trigger conversion update
    this.updateAmountAndShares();
  }

  // Add a watcher for amount changes
  async onAmountChange(newAmount: number) {
    this.expense.totalAmount = newAmount;
    if (this.expense.currency) {
      // Only convert if currency is selected
      await this.updateAmountAndShares();
    }
  }

  onPayerAmountInput(event: Event, memberId: string) {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Format the display value
    const formattedValue = this.formatNumberInput(value);
    input.value = formattedValue;

    // Update payer amount in original currency
    const payer = this.expense.payers.find((p) => p.memberId === memberId);
    if (payer) {
      payer.amount = parseFloat(value.replace(/,/g, '')) || 0;
    }
  }

  getTotalPaid(): number {
    return this.expense.payers.reduce(
      (sum, payer) => sum + (payer.amount || 0),
      0
    );
  }

  getRemainingAmount(): number {
    return Math.max(0, this.expense.totalAmount - this.getTotalPaid());
  }

  getMemberPayment(memberId: string) {
    let payer = this.expense.payers.find((p) => p.memberId === memberId);
    if (!payer) {
      payer = { memberId, amount: 0 };
      this.expense.payers.push(payer);
    }
    return payer;
  }

  togglePayerType(isMultiple: boolean) {
    this.isMultiplePayers = isMultiple;

    if (this.isMultiplePayers) {
      this.group$.pipe(take(1)).subscribe((group) => {
        if (group) {
          // Initialize all members with 0 amount
          this.expense.payers = group.members.map((member) => ({
            memberId: member.id,
            amount: 0,
          }));
        }
      });
    } else {
      // Reset to single payer
      this.expense.payers = [{ memberId: '', amount: 0 }];
    }
  }

  // For payment progress display
  getProgressText(): string {
    const totalPaid = this.getTotalPaid();
    const total = this.expense.totalAmount;

    return `${this.formatNumber(totalPaid)} of ${this.formatNumber(total)} ${
      this.expense.currency
    } paid`;
  }

  // Add this to your component
  isPaymentTotalValid(): boolean {
    const totalPaid = this.getTotalPaid();
    return Math.abs(totalPaid - this.expense.totalAmount) < 0.01;
  }

  formatNumberInput(value: string): string {
    // Remove existing commas and non-numeric characters except decimal
    value = value.replace(/,/g, '').replace(/[^\d.]/g, '');

    // If empty or just decimal point, return empty
    if (!value || value === '.') return '';

    // Split number into integer and decimal parts
    let [integer, decimal] = value.split('.');

    // Add commas to integer part
    integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Return with decimal if exists
    return decimal ? `${integer}.${decimal}` : integer;
  }
}
