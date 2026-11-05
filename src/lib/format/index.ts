/**
 * Locale-aware formatting helpers built on Intl.NumberFormat and Intl.DateTimeFormat.
 *
 * Single source of defaults: there is no hospital locale/currency setting in the
 * data model yet (UX-12, FUNC-29), so every formatter falls back to the constants
 * below. To change the hospital's locale or currency, change them here only, or
 * pass explicit options at the call site.
 */

/** Default locale for all hospital-facing formatting. */
export const HOSPITAL_LOCALE = "en-IN";
/** Default ISO 4217 currency code for all hospital-facing amounts. */
export const HOSPITAL_CURRENCY = "INR";

export interface CurrencyFormatOptions {
  locale?: string;
  currency?: string;
  /** Fraction digits (min and max). Defaults to 2. */
  fractionDigits?: number;
}

export type DateInput = Date | string | number | null | undefined;

const numberFormatCache = new Map<string, Intl.NumberFormat>();
const dateFormatCache = new Map<string, Intl.DateTimeFormat>();

function getNumberFormat(locale: string, currency: string, fractionDigits: number): Intl.NumberFormat {
  const key = `${locale}|${currency}|${fractionDigits}`;
  let formatter = numberFormatCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    numberFormatCache.set(key, formatter);
  }
  return formatter;
}

/** Converts a value to a finite number; anything else becomes 0. */
function toFiniteAmount(amount: number | string | null | undefined): number {
  const n = Number(amount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Formats an amount in the hospital currency.
 *
 * @example
 *   formatCurrency(1234.5)                  // "₹1,234.50"
 *   formatCurrency(1234.5, { fractionDigits: 0 }) // "₹1,235"
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options: CurrencyFormatOptions = {},
): string {
  const { locale = HOSPITAL_LOCALE, currency = HOSPITAL_CURRENCY, fractionDigits = 2 } = options;
  return getNumberFormat(locale, currency, fractionDigits).format(toFiniteAmount(amount));
}

/**
 * Formats a plain number with the hospital locale's grouping and decimals.
 *
 * @example
 *   formatNumber(1234567.891, { maximumFractionDigits: 1 }) // "12,34,567.9"
 */
export function formatNumber(
  value: number | string | null | undefined,
  options: Intl.NumberFormatOptions & { locale?: string } = {},
): string {
  const { locale = HOSPITAL_LOCALE, ...rest } = options;
  return new Intl.NumberFormat(locale, rest).format(toFiniteAmount(value));
}

/**
 * Formats a date with Intl.DateTimeFormat. Invalid or empty input returns "".
 *
 * Date-only values such as "2026-03-14" are parsed as local calendar dates, not UTC,
 * so they do not shift to the previous day in negative-offset time zones.
 *
 * @example
 *   formatDate("2026-03-14")                         // "14/03/2026"
 *   formatDate(new Date(), { dateStyle: "medium" })  // "5 Nov 2026"
 */
export function formatDate(value: DateInput, options: Intl.DateTimeFormatOptions & { locale?: string } = {}): string {
  if (value === null || value === undefined || value === "") return "";
  const { locale = HOSPITAL_LOCALE, ...rest } = options;
  const date = toLocalDate(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  const resolved: Intl.DateTimeFormatOptions =
    Object.keys(rest).length > 0 ? rest : { day: "2-digit", month: "2-digit", year: "numeric" };
  const key = `${locale}|${JSON.stringify(resolved)}`;
  let formatter = dateFormatCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, resolved);
    dateFormatCache.set(key, formatter);
  }
  return formatter.format(date);
}

function toLocalDate(value: Exclude<DateInput, null | undefined | "">): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  return new Date(value);
}
