import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { GroupService } from '../../../../services/group.service';
import { take } from 'rxjs';
import {
  CreateExpenseDto,
  Currency,
  ParticipantDto,
  PayerDto,
} from '../../../../models/types';
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
    currency: 'EUR',
    convertedAmount: 0,
    payers: [{ memberId: '', amount: 0, convertedAmount: 0 }] as PayerDto[],
    participants: [] as ParticipantDto[],
    date: new Date().toISOString().split('T')[0],
    splitType: 'equal' as 'equal' | 'custom',
  };

  showForm = false;
  isMultiplePayers = false;
  includeEveryone = true;

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

  async addExpense() {
    if (!this.expense.description || this.expense.totalAmount <= 0) {
      this.notificationService.show(
        'Please enter a valid description and total amount'
      );
      return;
    }

    this.group$.pipe(take(1)).subscribe(async (group) => {
      if (!group) return;

      // Validate multiple payers total matches using original amounts
      if (this.isMultiplePayers) {
        const totalPaidOriginal = this.expense.payers.reduce(
          (sum, payer) => sum + (payer.amount || 0),
          0
        );

        // Check if original amounts match (allowing for small floating point differences)
        if (Math.abs(totalPaidOriginal - this.expense.totalAmount) > 0.01) {
          this.notificationService.show(
            `Total amount (${this.formatNumber(this.expense.totalAmount)} ${
              this.expense.currency
            }) doesn't match sum of individual payments (${this.formatNumber(
              totalPaidOriginal
            )} ${this.expense.currency})`
          );
          return;
        }

        // If currencies are different, ensure all payers have converted amounts
        if (this.expense.currency !== group.currency) {
          const conversionPromises = this.expense.payers
            .filter((payer) => payer.amount > 0)
            .map(async (payer) => {
              const converted = await this.currencyService
                .convertCurrency(
                  payer.amount,
                  this.expense.currency,
                  group.currency
                )
                .toPromise();
              payer.convertedAmount = converted ?? payer.amount;
            });

          await Promise.all(conversionPromises);
        } else {
          // If currencies are the same, convertedAmount equals amount
          this.expense.payers.forEach((payer) => {
            payer.convertedAmount = payer.amount;
          });
        }
      }

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
        // Convert total amount if currencies are different
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

        // Handle payer amounts and conversion
        if (this.expense.payers.length > 0) {
          if (this.isMultiplePayers) {
            // For multiple payers, convert each payer's amount individually
            await Promise.all(
              this.expense.payers.map(async (payer) => {
                if (
                  this.expense.currency !== group.currency &&
                  payer.amount > 0
                ) {
                  const convertedAmount = await this.currencyService
                    .convertCurrency(
                      payer.amount,
                      this.expense.currency,
                      group.currency
                    )
                    .toPromise();
                  payer.convertedAmount = convertedAmount ?? payer.amount;
                } else {
                  payer.convertedAmount = payer.amount;
                }
              })
            );
          } else {
            // Single payer gets the full converted amount
            this.expense.payers[0].amount = this.expense.totalAmount;
            this.expense.payers[0].convertedAmount =
              this.expense.convertedAmount;
          }
        }

        // Update participant shares based on converted amount
        if (this.includeEveryone) {
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

        this.cdr.detectChanges();
      } catch (error) {
        console.error('Currency conversion failed:', error);
        this.notificationService.show(
          'Failed to convert currency. Please try again.'
        );
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

    // Allow only numbers and a single decimal point
    const rawValue = input.value
      .replace(/[^0-9.]/g, '')
      .replace(/(\..*?)\..*/g, '$1');

    // Parse the value as a float for calculations
    const numericValue = parseFloat(rawValue) || null;
    this.expense.totalAmount = numericValue ?? 0;

    // Update the input value to reflect the properly formatted number
    input.value = rawValue;

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

    // Allow only numbers and a single decimal point
    const rawValue = input.value
      .replace(/[^0-9.]/g, '')
      .replace(/(\..*?)\..*/g, '$1');

    // Parse the value as a float
    const numericValue = parseFloat(rawValue) || null;

    // Update the payer's amount in the model
    const payer = this.expense.payers.find((p) => p.memberId === memberId);
    if (payer) {
      payer.amount = numericValue ?? 0;
    }

    // Update the input value to reflect the properly formatted number
    input.value = rawValue;
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

  getMemberPayment(memberId: string): PayerDto {
    let payer = this.expense.payers.find((p) => p.memberId === memberId);
    if (!payer) {
      payer = { memberId, amount: 0, convertedAmount: 0 };
      this.expense.payers.push(payer);
    }
    return payer;
  }

  togglePayerType(isMultiple: boolean) {
    this.isMultiplePayers = isMultiple;

    if (this.isMultiplePayers) {
      this.group$.pipe(take(1)).subscribe((group) => {
        if (group) {
          this.expense.payers = group.members.map((member) => ({
            memberId: member.id,
            amount: 0,
            convertedAmount: 0,
          }));
        }
      });
    } else {
      this.expense.payers = [{ memberId: '', amount: 0, convertedAmount: 0 }];
    }
  }
}
