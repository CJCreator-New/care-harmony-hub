import DOMPurify from 'dompurify';

/**
 * Sanitize user input for safe display
 * Uses DOMPurify for XSS prevention
 * Note: For database queries, use parameterized queries (Supabase handles this)
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove HTML tags and sanitize for XSS prevention
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  }).trim().substring(0, 1000);
}

/**
 * Sanitize array input (comma-separated values)
 */
export function sanitizeArray(input: string): string[] {
  if (!input) return [];
  
  return input
    .split(',')
    .map(item => sanitizeInput(item))
    .filter(item => item.length > 0)
    .slice(0, 20);
}

/**
 * Sanitize log message - remove potential PHI
 */
export function sanitizeLogMessage(message: string | unknown): string {
  // Ensure message is a string
  const msg = typeof message === 'string' ? message : String(message || '');
  
  // Remove potential PHI from log messages
  return msg
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]') // SSN
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]') // Credit card
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Email
    .replace(/\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, '[PHONE]') // Phone
    .substring(0, 5000); // Limit log message length
}

export const sanitizeForLog = sanitizeLogMessage;
export const sanitizeHtml = sanitizeInput; // Alias for HTML sanitization