import DOMPurify from 'dompurify';

export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove HTML tags and sanitize
  const sanitized = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
  
  // Additional sanitization for SQL injection prevention
  return sanitized
    .replace(/['"`;\\]/g, '') // Remove dangerous SQL characters
    .trim()
    .substring(0, 1000); // Limit length
}

export function sanitizeArray(input: string): string[] {
  if (!input) return [];
  
  return input
    .split(',')
    .map(item => sanitizeInput(item))
    .filter(item => item.length > 0)
    .slice(0, 20); // Limit array size
}

export function sanitizeLogMessage(message: string): string {
  // Remove potential PHI from log messages
  return message
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]') // SSN
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]') // Credit card
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Email
    .replace(/\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, '[PHONE]'); // Phone
}

export const sanitizeForLog = sanitizeLogMessage;