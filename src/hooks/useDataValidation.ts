import { useState } from 'react';
import { validationEngine } from '@/utils/validationEngine';

interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'phone' | 'numeric' | 'date' | 'custom';
  message: string;
  validator?: (value: any) => boolean;
}

export const useDataValidation = (rules: ValidationRule[]) => {
  const [errors, setErrors] = useState<string[]>([]);

  const validate = (data: Record<string, any>) => {
    const result = validationEngine.validate(data, rules);
    setErrors(result.errors);
    return result.valid;
  };

  const clearErrors = () => setErrors([]);

  return { validate, errors, clearErrors };
};
