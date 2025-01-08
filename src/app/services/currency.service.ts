import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

interface ExchangeRateResponse {
  result: string;
  base_code: string;
  conversion_rates: { [key: string]: number };
}

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  private apiKey = '1e65a7ed74c9d47d7b853bb8';
  private baseUrl = 'https://v6.exchangerate-api.com/v6';

  constructor(private http: HttpClient) {}

  getAvailableCurrencies(): Observable<any[]> {
    // Get rates with EUR as base to get all available currencies
    return this.http
      .get<ExchangeRateResponse>(`${this.baseUrl}/${this.apiKey}/latest/EUR`)
      .pipe(
        map((response) => {
          return Object.keys(response.conversion_rates).map((code) => ({
            code,
            name: new Intl.DisplayNames(['en'], { type: 'currency' }).of(code),
          }));
        }),
        catchError(this.handleError)
      );
  }

  convertCurrency(
    amount: number,
    from: string,
    to: string
  ): Observable<number> {
    return this.http
      .get<ExchangeRateResponse>(
        `${this.baseUrl}/${this.apiKey}/latest/${from}`
      )
      .pipe(
        map((response) => {
          const rate = response.conversion_rates[to];
          if (!rate) {
            throw new Error(`Conversion rate not found for ${to}`);
          }
          return amount * rate;
        }),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';

    if (error.error && error.error['error-type']) {
      switch (error.error['error-type']) {
        case 'unsupported-code':
          errorMessage = 'Currency code is not supported';
          break;
        case 'malformed-request':
          errorMessage = 'Invalid request format';
          break;
        case 'invalid-key':
          errorMessage = 'Invalid API key';
          break;
        case 'inactive-account':
          errorMessage = 'Account is not active';
          break;
        case 'quota-reached':
          errorMessage = 'API quota has been reached';
          break;
        default:
          errorMessage = 'An unexpected error occurred';
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
