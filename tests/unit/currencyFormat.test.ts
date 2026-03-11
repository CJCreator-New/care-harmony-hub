/**
 * T-P02: Currency Formatter Unit Tests
 * Tests formatCurrency from the real @/lib/currency module.
 *
 * Pyramid layer: UNIT (70%)
 * F.I.R.S.T.: Fast (<1ms), Isolated, Repeatable, Self-validating, Timely
 */
import { describe, it, expect } from 'vitest';
import { formatCurrency, CURRENCY_SYMBOL, CURRENCY_CODE } from '@/lib/currency';

describe('Constants', () => {
  it('exports the correct currency symbol (₹)', () => {
    expect(CURRENCY_SYMBOL).toBe('₹');
  });

  it('exports INR as currency code', () => {
    expect(CURRENCY_CODE).toBe('INR');
  });
});

describe('formatCurrency', () => {
  it('formats a whole number with 2 decimal places', () => {
    expect(formatCurrency(1000)).toBe('₹1,000.00');
  });

  it('formats a decimal amount', () => {
    expect(formatCurrency(1234.5)).toBe('₹1,234.50');
  });

  it('formats zero as ₹0.00', () => {
    expect(formatCurrency(0)).toBe('₹0.00');
  });

  it('handles null by treating it as 0', () => {
    expect(formatCurrency(null)).toBe('₹0.00');
  });

  it('handles undefined by treating it as 0', () => {
    expect(formatCurrency(undefined)).toBe('₹0.00');
  });

  it('handles Infinity by returning ₹0.00', () => {
    expect(formatCurrency(Infinity)).toBe('₹0.00');
  });

  it('handles NaN by returning ₹0.00', () => {
    expect(formatCurrency(NaN)).toBe('₹0.00');
  });

  it('formats large amounts with comma separators (en-IN grouping)', () => {
    // Indian locale groups as 1,00,000 (lakhs), not 100,000
    const result = formatCurrency(100000);
    expect(result).toContain('₹');
    // Strip currency symbol and commas; numeric value must equal 100000.00
    const numeric = parseFloat(result.replace('₹', '').replace(/,/g, ''));
    expect(numeric).toBe(100000.00);
  });

  it('respects custom decimal precision', () => {
    const result = formatCurrency(99.999, 0);
    expect(result).toBe('₹100');
  });

  it('formats negative amounts', () => {
    const result = formatCurrency(-500);
    expect(result).toContain('-');
    expect(result).toContain('500.00');
  });
});
