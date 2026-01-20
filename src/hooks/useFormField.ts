import { useId } from 'react';

// Hook for accessible form fields
export function useFormField() {
  const id = useId();
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  return {
    fieldId: id,
    errorId,
    descriptionId,
    getFieldProps: (hasError: boolean, hasDescription: boolean) => ({
      id,
      'aria-invalid': hasError,
      'aria-describedby': [
        hasError && errorId,
        hasDescription && descriptionId,
      ].filter(Boolean).join(' ') || undefined,
    }),
    getErrorProps: () => ({
      id: errorId,
      role: 'alert',
      'aria-live': 'polite' as const,
    }),
    getDescriptionProps: () => ({
      id: descriptionId,
    }),
  };
}

// Accessible form validation messages
export const VALIDATION_MESSAGES = {
  required: (field: string) => `${field} is required`,
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  minLength: (field: string, min: number) => 
    `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) => 
    `${field} must not exceed ${max} characters`,
  pattern: (field: string) => `${field} format is invalid`,
  min: (field: string, min: number) => 
    `${field} must be at least ${min}`,
  max: (field: string, max: number) => 
    `${field} must not exceed ${max}`,
};
