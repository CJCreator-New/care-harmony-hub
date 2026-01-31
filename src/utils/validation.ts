interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

export const validators = {
  email: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  phone: (value: string): boolean => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(value) && value.replace(/\D/g, '').length >= 10;
  },

  password: (value: string): boolean => {
    return value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value);
  },

  url: (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  date: (value: string): boolean => {
    return !isNaN(Date.parse(value));
  },

  number: (value: any): boolean => {
    return !isNaN(parseFloat(value)) && isFinite(value);
  },

  alphanumeric: (value: string): boolean => {
    return /^[a-zA-Z0-9]+$/.test(value);
  },
};

export const validateField = (value: any, rules: ValidationRule): ValidationError | null => {
  if (rules.required && !value) {
    return { field: 'field', message: 'This field is required' };
  }

  if (value && rules.minLength && value.length < rules.minLength) {
    return { field: 'field', message: `Minimum length is ${rules.minLength}` };
  }

  if (value && rules.maxLength && value.length > rules.maxLength) {
    return { field: 'field', message: `Maximum length is ${rules.maxLength}` };
  }

  if (value && rules.pattern && !rules.pattern.test(value)) {
    return { field: 'field', message: 'Invalid format' };
  }

  if (value && rules.custom && !rules.custom(value)) {
    return { field: 'field', message: 'Validation failed' };
  }

  return null;
};

export const validateForm = (
  data: Record<string, any>,
  schema: Record<string, ValidationRule>
): ValidationError[] => {
  const errors: ValidationError[] = [];

  Object.entries(schema).forEach(([field, rules]) => {
    const error = validateField(data[field], rules);
    if (error) {
      errors.push({ ...error, field });
    }
  });

  return errors;
};
