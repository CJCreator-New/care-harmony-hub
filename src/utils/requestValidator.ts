import { z } from 'zod';

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'email' | 'phone' | 'date' | 'uuid' | 'url' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  sanitize?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  data?: Record<string, unknown>;
  errors: Record<string, string[]>;
}

class RequestValidator {
  private static instance: RequestValidator;
  private schemas: Map<string, z.ZodSchema> = new Map();

  private constructor() {}

  static getInstance(): RequestValidator {
    if (!RequestValidator.instance) {
      RequestValidator.instance = new RequestValidator();
    }
    return RequestValidator.instance;
  }

  validate(data: unknown, rules: ValidationRule[]): ValidationResult {
    const errors: Record<string, string[]> = {};
    const validatedData: Record<string, unknown> = {};

    if (typeof data !== 'object' || data === null) {
      return { valid: false, errors: { _root: ['Invalid request data'] } };
    }

    const obj = data as Record<string, unknown>;

    for (const rule of rules) {
      const value = obj[rule.field];
      const fieldErrors: string[] = [];

      if (rule.required && (value === undefined || value === null || value === '')) {
        fieldErrors.push(`${rule.field} is required`);
      } else if (value !== undefined && value !== null) {
        const typeErrors = this.validateType(value, rule);
        fieldErrors.push(...typeErrors);

        if (fieldErrors.length === 0 && rule.sanitize) {
          validatedData[rule.field] = this.sanitize(value, rule.type);
        } else if (fieldErrors.length === 0) {
          validatedData[rule.field] = value;
        }
      }

      if (fieldErrors.length > 0) {
        errors[rule.field] = fieldErrors;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      data: Object.keys(errors).length === 0 ? validatedData : undefined,
      errors,
    };
  }

  private validateType(value: unknown, rule: ValidationRule): string[] {
    const errors: string[] = [];

    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${rule.field} must be a string`);
        } else {
          if (rule.minLength && value.length < rule.minLength) {
            errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
          }
          if (rule.maxLength && value.length > rule.maxLength) {
            errors.push(`${rule.field} must be at most ${rule.maxLength} characters`);
          }
          if (rule.pattern && !rule.pattern.test(value)) {
            errors.push(`${rule.field} format is invalid`);
          }
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !this.isValidEmail(value)) {
          errors.push(`${rule.field} must be a valid email`);
        }
        break;

      case 'phone':
        if (typeof value !== 'string' || !this.isValidPhone(value)) {
          errors.push(`${rule.field} must be a valid phone number`);
        }
        break;

      case 'uuid':
        if (typeof value !== 'string' || !this.isValidUUID(value)) {
          errors.push(`${rule.field} must be a valid UUID`);
        }
        break;

      case 'url':
        if (typeof value !== 'string' || !this.isValidURL(value)) {
          errors.push(`${rule.field} must be a valid URL`);
        }
        break;

      case 'date':
        if (!(value instanceof Date) && typeof value !== 'string') {
          errors.push(`${rule.field} must be a valid date`);
        } else if (typeof value === 'string' && isNaN(Date.parse(value))) {
          errors.push(`${rule.field} must be a valid date`);
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`${rule.field} must be a number`);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${rule.field} must be an array`);
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`${rule.field} must be an object`);
        }
        break;
    }

    return errors;
  }

  private sanitize(value: unknown, type: string): unknown {
    if (typeof value !== 'string') return value;

    switch (type) {
      case 'string':
        return this.sanitizeString(value);
      case 'email':
        return value.toLowerCase().trim();
      case 'phone':
        return value.replace(/\D/g, '');
      case 'url':
        return this.sanitizeURL(value);
      default:
        return value;
    }
  }

  private sanitizeString(str: string): string {
    return str
      .trim()
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  private sanitizeURL(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.toString();
    } catch {
      return '';
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  registerSchema(name: string, schema: z.ZodSchema): void {
    this.schemas.set(name, schema);
  }

  validateWithSchema(name: string, data: unknown): ValidationResult {
    const schema = this.schemas.get(name);
    if (!schema) {
      return { valid: false, errors: { _root: [`Schema ${name} not found`] } };
    }

    try {
      const validated = schema.parse(data);
      return { valid: true, data: validated as Record<string, unknown>, errors: {} };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string[]> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!errors[path]) errors[path] = [];
          errors[path].push(err.message);
        });
        return { valid: false, errors };
      }
      return { valid: false, errors: { _root: ['Validation failed'] } };
    }
  }
}

export const requestValidator = RequestValidator.getInstance();
