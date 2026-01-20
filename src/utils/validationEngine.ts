interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'phone' | 'numeric' | 'date' | 'custom';
  message: string;
  validator?: (value: any) => boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const validationEngine = {
  validate(data: Record<string, any>, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];

    rules.forEach(rule => {
      const value = data[rule.field];

      switch (rule.type) {
        case 'required':
          if (!value || value === '') errors.push(rule.message);
          break;
        case 'email':
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.push(rule.message);
          break;
        case 'phone':
          if (value && !/^\+?[\d\s-()]+$/.test(value)) errors.push(rule.message);
          break;
        case 'numeric':
          if (value && isNaN(Number(value))) errors.push(rule.message);
          break;
        case 'custom':
          if (rule.validator && !rule.validator(value)) errors.push(rule.message);
          break;
      }
    });

    return { valid: errors.length === 0, errors };
  }
};
