/**
 * App-wide currency helpers — BUG-20: unify the currency symbol used across
 * Dashboard, Billing, Pharmacy, and Inventory so all modules show the same symbol.
 *
 * Change CURRENCY_SYMBOL here (and CURRENCY_CODE if you adopt Intl formatting)
 * to update every formatted amount in the application.
 */
export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';

/**
 * Format a numeric amount as a currency string.
 *
 * @example
 *   formatCurrency(1234.5)  // "₹1,234.50"
 */
export const formatCurrency = (amount: number | null | undefined, decimals = 2): string => {
  const safe = Number(amount ?? 0);
  if (!isFinite(safe)) return `${CURRENCY_SYMBOL}0.00`;
  return `${CURRENCY_SYMBOL}${safe.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};
