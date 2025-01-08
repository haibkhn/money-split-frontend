import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { inject } from '@angular/core';
import { GroupService } from '../../../../services/group.service';
import { take } from 'rxjs';
import { Currency } from '../../../../models/types';
import { CurrencyService } from '../../../../services/currency.service';

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-form.component.html',
  styleUrls: ['./expense-form.component.scss'],
})
export class ExpenseFormComponent {
  private groupService = inject(GroupService);
  private currencyService = inject(CurrencyService);
  private ngZone = inject(NgZone);

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
  }

  updateParticipantShares() {
    if (
      this.expense.splitType === 'equal' &&
      this.expense.participants.length > 0
    ) {
      const perPersonShare =
        this.expense.convertedAmount / this.expense.participants.length;
      this.expense.participants.forEach((participant) => {
        participant.share = perPersonShare;
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

  addExpense() {
    if (!this.expense.description || this.expense.totalAmount <= 0) {
      alert('Please enter a valid description and total amount.');
      return;
    }

    this.group$.pipe(take(1)).subscribe(async (group) => {
      if (!group) return;

      try {
        // Ensure the amount is converted
        await this.updateAmountAndShares();

        // Create the expense with both original and converted amounts
        const newExpense = {
          id: Date.now().toString(),
          description: this.expense.description,
          totalAmount: this.expense.totalAmount,
          currency: this.expense.currency,
          convertedAmount: this.expense.convertedAmount,
          payers: this.expense.payers,
          participants: this.expense.participants,
          date: this.expense.date,
          splitType: this.expense.splitType,
        };

        this.groupService.addExpense(group.id, newExpense);

        setTimeout(() => {
          this.resetForm();
          this.showForm = false;
        });
      } catch (error) {
        alert('Failed to process expense. Please try again.');
        console.error('Error adding expense:', error);
      }
    });
  }

  // Update reset form to include currency
  resetForm() {
    this.expense = {
      description: '',
      totalAmount: 0,
      currency: 'EUR',
      convertedAmount: 0,
      payers: [{ memberId: '', amount: 0 }],
      participants: [],
      date: new Date().toISOString().split('T')[0],
      splitType: 'equal',
    };
    this.displayAmount = ''; // Reset display amount
    this.showForm = false;
    this.isMultiplePayers = false;
    this.includeEveryone = true;
  }

  isParticipantSelected(memberId: string): boolean {
    return this.expense.participants.some((p) => p.memberId === memberId);
  }

  async updateAmountAndShares() {
    if (this.expense.totalAmount <= 0) return;

    this.group$.pipe(take(1)).subscribe(async (group) => {
      if (!group) return;

      try {
        // Convert amount to group's currency
        const converted = await this.currencyService
          .convertCurrency(
            this.expense.totalAmount,
            this.expense.currency,
            group.currency
          )
          .toPromise();

        // Add null check and default to 0 if conversion fails
        this.expense.convertedAmount = converted ?? this.expense.totalAmount;

        // Update payer amounts
        if (this.expense.payers.length > 0) {
          const equalAmount =
            this.expense.convertedAmount / this.expense.payers.length;
          this.expense.payers.forEach((payer) => {
            payer.amount = equalAmount;
          });
        }

        // Update participant shares
        if (this.expense.participants.length > 0) {
          const equalShare =
            this.expense.convertedAmount / this.expense.participants.length;
          this.expense.participants.forEach((participant) => {
            participant.share = equalShare;
          });
        }
      } catch (error) {
        console.error('Currency conversion failed:', error);
      }
    });
  }

  // For display in the input
  formatNumber(value: number): string {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // For parsing the input value
  parseNumber(value: string): number {
    return Number(value.replace(/,/g, ''));
  }

  onAmountInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^\d,]/g, ''); // Remove non-digits and non-commas

    // Remove extra commas and format
    value = value.replace(/,/g, '');
    if (value) {
      const number = parseInt(value);
      this.displayAmount = this.formatNumber(number);
    } else {
      this.displayAmount = '';
    }

    this.updatePayerAmount();
  }
}
