/**
 * Security Utilities for CareSync HIMS
 * Prevents XSS, validates inputs, and sanitizes data
 */

/**
 * Sanitize HTML by stripping all tags
 * Prevents XSS attacks in user-generated content
 */
export const sanitizeHtml = (input: string | null | undefined): string => {
  if (!input) return '';
  return String(input).replace(/<[^>]*>/g, '');
};

/**
 * Sanitize and truncate text for display
 */
export const sanitizeText = (
  input: string | null | undefined,
  maxLength?: number
): string => {
  const sanitized = sanitizeHtml(input);
  if (maxLength && sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength) + '...';
  }
  return sanitized;
};

/**
 * Validate and sanitize email
 */
export const sanitizeEmail = (email: string | null | undefined): string => {
  if (!email) return '';
  const sanitized = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : '';
};

/**
 * Validate and sanitize phone number
 */
export const sanitizePhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  return String(phone).replace(/[^\d+\-() ]/g, '');
};

/**
 * Sanitize numeric input
 */
export const sanitizeNumber = (
  input: string | number | null | undefined,
  defaultValue: number = 0
): number => {
  if (input === null || input === undefined) return defaultValue;
  const num = typeof input === 'string' ? parseFloat(input) : input;
  return isNaN(num) ? defaultValue : num;
};

/**
 * Validate date and return safe value
 */
export const validateDate = (
  date: string | Date | null | undefined
): Date | null => {
  if (!date) return null;
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Safe JSON parse with fallback
 */
export const safeJsonParse = <T>(
  json: string | null | undefined,
  fallback: T
): T => {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};

/**
 * Escape special characters for safe display
 */
export const escapeHtml = (text: string | null | undefined): string => {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return String(text).replace(/[&<>"'/]/g, (char) => map[char]);
};

/**
 * Validate and sanitize URL
 */
export const sanitizeUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  const sanitized = String(url).trim();
  // Only allow http, https, and mailto protocols
  if (
    sanitized.startsWith('http://') ||
    sanitized.startsWith('https://') ||
    sanitized.startsWith('mailto:')
  ) {
    return sanitized;
  }
  return '';
};

/**
 * Sanitize file name
 */
export const sanitizeFileName = (
  fileName: string | null | undefined
): string => {
  if (!fileName) return '';
  // Remove path traversal attempts and dangerous characters
  return String(fileName)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255);
};

/**
 * Validate MRN (Medical Record Number)
 */
export const validateMRN = (mrn: string | null | undefined): boolean => {
  if (!mrn) return false;
  // MRN should be alphanumeric, typically 6-12 characters
  const mrnRegex = /^[A-Z0-9]{6,12}$/i;
  return mrnRegex.test(String(mrn));
};

/**
 * Sanitize search query
 */
export const sanitizeSearchQuery = (
  query: string | null | undefined
): string => {
  if (!query) return '';
  // Remove special SQL/NoSQL characters
  return String(query)
    .replace(/[;'"\\]/g, '')
    .trim()
    .substring(0, 100);
};
