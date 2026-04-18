import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAmount(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return numAmount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

export function parseDecimalAmount(amount: string): number {
  // Use parseFloat and ensure proper decimal precision
  const parsed = parseFloat(amount);
  if (isNaN(parsed)) return 0;
  // Convert to string with fixed decimals then back to number to maintain exact precision
  return parseFloat(parsed.toFixed(2));
}

export function formatAccountType(accountType: string): string {
  if (!accountType) return '';
  // Replace underscores and hyphens with spaces, then capitalize each word
  return accountType
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Alias for backward compatibility
export const capitalizeAccountType = formatAccountType;

export const SUPPORTED_CURRENCIES = {
  USD: { symbol: '$', label: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', label: 'Euro', locale: 'de-DE' },
  GBP: { symbol: '£', label: 'British Pound', locale: 'en-GB' }
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

export function getCurrencySymbol(currency: string): string {
  return SUPPORTED_CURRENCIES[currency as CurrencyCode]?.symbol || '$';
}

export function formatCurrencyAmount(amount: number, currency: string = 'USD'): string {
  const currencyInfo = SUPPORTED_CURRENCIES[currency as CurrencyCode] || SUPPORTED_CURRENCIES.USD;
  return `${currencyInfo.symbol}${amount.toLocaleString(currencyInfo.locale, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}
