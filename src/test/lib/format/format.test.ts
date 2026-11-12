import { describe, it, expect } from 'vitest';
import {
  HOSPITAL_CURRENCY,
  HOSPITAL_LOCALE,
  formatCurrency,
  formatDate,
  formatNumber,
} from '@/lib/format';

describe('hospital format defaults', () => {
  it('documents one locale and currency', () => {
    expect(HOSPITAL_LOCALE).toBe('en-IN');
    expect(HOSPITAL_CURRENCY).toBe('INR');
  });
});

describe('formatCurrency', () => {
  it('formats with the hospital currency and two decimals by default', () => {
    expect(formatCurrency(1234.5)).toBe('₹1,234.50');
    expect(formatCurrency(0)).toBe('₹0.00');
  });

  it('uses Indian digit grouping', () => {
    expect(formatCurrency(12345678.9)).toBe('₹1,23,45,678.90');
  });

  it('accepts numeric strings', () => {
    expect(formatCurrency('99.9')).toBe('₹99.90');
  });

  it('treats null, undefined, NaN and Infinity as zero', () => {
    expect(formatCurrency(null)).toBe('₹0.00');
    expect(formatCurrency(undefined)).toBe('₹0.00');
    expect(formatCurrency(Number.NaN)).toBe('₹0.00');
    expect(formatCurrency(Number.POSITIVE_INFINITY)).toBe('₹0.00');
  });

  it('honours explicit fraction digits, locale and currency overrides', () => {
    expect(formatCurrency(1234.5, { fractionDigits: 0 })).toBe('₹1,235');
    expect(formatCurrency(1234.5, { locale: 'en-US', currency: 'USD' })).toBe('$1,234.50');
  });

  it('never emits a dollar sign for the default hospital currency', () => {
    expect(formatCurrency(10)).not.toContain('$');
  });
});

describe('formatNumber', () => {
  it('groups digits with the hospital locale', () => {
    expect(formatNumber(1234567)).toBe('12,34,567');
    expect(formatNumber('abc')).toBe('0');
  });
});

describe('formatDate', () => {
  it('returns an empty string for missing or invalid input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
    expect(formatDate('not a date')).toBe('');
  });

  it('formats date-only strings as local calendar dates', () => {
    expect(formatDate('2026-03-14')).toBe('14/03/2026');
  });

  it('accepts Date and epoch-millisecond inputs', () => {
    const d = new Date(2026, 10, 5);
    expect(formatDate(d)).toBe('05/11/2026');
    expect(formatDate(d.getTime())).toBe('05/11/2026');
  });

  it('passes Intl options through', () => {
    expect(formatDate('2026-03-14', { dateStyle: 'medium' })).toMatch(/14 Mar 2026/);
  });
});
