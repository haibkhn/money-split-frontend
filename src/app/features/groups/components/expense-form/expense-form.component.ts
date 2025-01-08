import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);

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
      console.log('Group loaded:', group);

      if (group) {
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
    console.log('Participants after toggle:', this.expense.participants);
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

  async addExpense() {
    if (!this.expense.description || this.expense.totalAmount <= 0) {
      alert('Please enter a valid description and total amount.');
      return;
    }

    this.group$.pipe(take(1)).subscribe(async (group) => {
      if (!group) return;

      try {
        // Create the new expense first
        const newExpense = {
          id: Date.now().toString(),
          description: this.expense.description,
          totalAmount: this.expense.totalAmount,
          currency: this.expense.currency,
          convertedAmount: this.expense.convertedAmount,
          payers: [...this.expense.payers], // Create a copy
          participants: [...this.expense.participants], // Create a copy
          date: this.expense.date,
          splitType: this.expense.splitType,
        };

        // Log the expense state before conversion
        console.log('Expense before conversion:', {
          totalAmount: newExpense.totalAmount,
          payers: newExpense.payers,
          participants: newExpense.participants,
        });

        // Convert currency if needed
        if (newExpense.currency !== group.currency) {
          const converted = await this.currencyService
            .convertCurrency(
              newExpense.totalAmount,
              newExpense.currency,
              group.currency
            )
            .toPromise();

          newExpense.convertedAmount = converted ?? newExpense.totalAmount;
        } else {
          newExpense.convertedAmount = newExpense.totalAmount;
        }

        // Update shares based on converted amount
        if (this.includeEveryone) {
          const perPersonShare =
            newExpense.convertedAmount / group.members.length;
          newExpense.participants = group.members.map((member) => ({
            memberId: member.id,
            share: perPersonShare,
          }));
        }

        // Update payer amounts if needed
        if (!this.isMultiplePayers) {
          newExpense.payers = [
            {
              memberId: newExpense.payers[0].memberId,
              amount: newExpense.convertedAmount,
            },
          ];
        }

        console.log('Final expense state:', newExpense);

        // Add the expense
        this.groupService.addExpense(group.id, newExpense);

        setTimeout(() => {
          this.resetForm();
          this.showForm = false;
        });
      } catch (error) {
        console.error('Error adding expense:', error);
        alert('Failed to add expense. Please try again.');
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
          console.log('Updating payer amounts');
          const equalAmount =
            this.expense.convertedAmount / this.expense.payers.length;
          this.expense.payers.forEach((payer) => {
            payer.amount = equalAmount;
          });
          console.log('Payer Amounts updated:', this.expense.payers);
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
        console.log('Participant Shares:', this.expense.participants);

        this.cdr.detectChanges();
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

  // Add a watcher for amount changes
  async onAmountChange(newAmount: number) {
    this.expense.totalAmount = newAmount;
    if (this.expense.currency) {
      // Only convert if currency is selected
      await this.updateAmountAndShares();
    }
  }
}
