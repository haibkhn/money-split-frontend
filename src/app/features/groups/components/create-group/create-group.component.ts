import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { GroupService } from '../../../../services/group.service';
import { CurrencyService } from '../../../../services/currency.service';
import { Currency } from '../../../../models/types';

@Component({
  selector: 'app-create-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-group.component.html',
  styleUrls: ['./create-group.component.scss'],
})
export class CreateGroupComponent implements OnInit {
  private router = inject(Router);
  private groupService = inject(GroupService);
  private currencyService = inject(CurrencyService);

  groupName = '';
  selectedCurrency = 'EUR'; // Default currency
  currencies: Currency[] = [];
  isLoading = false;
  error = '';

  ngOnInit() {
    this.loadCurrencies();
  }

  loadCurrencies() {
    this.isLoading = true;
    this.error = '';

    this.currencyService.getAvailableCurrencies().subscribe({
      next: (currencies) => {
        this.currencies = currencies;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load currencies. ' + err.message;
        this.isLoading = false;
      },
    });
  }

  createGroup() {
    if (!this.groupName.trim()) {
      this.error = 'Please enter a group name';
      return;
    }

    if (!this.selectedCurrency) {
      this.error = 'Please select a currency';
      return;
    }

    const groupId = Math.random().toString(36).substring(2, 8);
    const newGroup = {
      id: groupId,
      name: this.groupName.trim(),
      currency: this.selectedCurrency,
      members: [],
      expenses: [],
    };

    this.groupService.createGroup(newGroup);
    this.router.navigate(['/g', groupId]);
  }
}
