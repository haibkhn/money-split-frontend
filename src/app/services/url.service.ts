import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UrlService {
  private readonly base62Chars =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  encodeId(uuid: string): string {
    console.log('Encoding UUID:', uuid);
    // Remove hyphens and convert to decimal
    const hex = uuid.replace(/-/g, '');
    const decimal = BigInt(`0x${hex}`);
    const encoded = this.toBase62(decimal);
    console.log('Encoded ID:', encoded);
    return encoded;
  }

  decodeId(shortId: string): string {
    console.log('Decoding shortId:', shortId);
    // Convert from base62 to UUID format
    const decimal = this.fromBase62(shortId);
    const hex = decimal.toString(16).padStart(32, '0');
    const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
      12,
      16
    )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    console.log('Decoded UUID:', uuid);
    return uuid;
  }

  private toBase62(decimal: bigint): string {
    if (decimal === BigInt(0)) return '0';
    let result = '';
    let value = decimal;
    while (value > BigInt(0)) {
      result = this.base62Chars[Number(value % BigInt(62))] + result;
      value = value / BigInt(62);
    }
    return result;
  }

  private fromBase62(str: string): bigint {
    let result = BigInt(0);
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const value = this.base62Chars.indexOf(char);
      if (value === -1) {
        console.error('Invalid character in shortId:', char);
        return BigInt(0);
      }
      result = result * BigInt(62) + BigInt(value);
    }
    return result;
  }
}
