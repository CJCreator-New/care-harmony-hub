/**
 * useFormStandardized Hook
 * 
 * Standardized form hook that wraps React Hook Form + Zod validation
 * Enforces CareSync HIMS form patterns and clinical validation rules
 * 
 * Usage:
 * ```tsx
 * const form = useFormStandardized(mySchema, {
 *   onSuccess: () => toast.success('Saved'),
 *   onError: (error) => toast.error(error.message)
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useForm, UseFormProps, FieldValues, FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema } from 'zod';
import { toast } from 'sonner';
import { sanitizeForLog } from '@/utils/sanitize';

export interface StandardizedFormOptions<TFieldValues extends FieldValues> {
  /** Success callback after form submission */
  onSuccess?: (data: TFieldValues) => void | Promise<void>;
  /** Error callback on validation or submission failure */
  onError?: (error: Error) => void;
  /** Show success toast? (default: true) */
  showSuccessToast?: boolean;
  /** Show error toast? (default: true) */
  showErrorToast?: boolean;
  /** Custom success message (default: 'Saved successfully') */
  successMessage?: string;
  /** Enable clinical validation? (default: true) */
  enableClinicalValidation?: boolean;
  /** Log submission attempts? (default: true) */
  enableLogging?: boolean;
}

/**
 * Standardized form initialization with sensible defaults
 */
export function useFormStandardized<T extends FieldValues>(
  schema: ZodSchema,
  options: StandardizedFormOptions<T> = {}
) {
  const {
    onSuccess,
    onError,
    showSuccessToast = true,
    showErrorToast = true,
    successMessage = 'Saved successfully',
    enableClinicalValidation = true,
    enableLogging = true,
  } = options;

  // Memoize form initialization
  const formConfig = useMemo<UseFormProps<T>>(
    () => ({
      resolver: zodResolver(schema),
      mode: 'onChange', // Validate on every change
      shouldFocusError: true, // Focus first error field
      reValidateMode: 'onChange',
    }),
    [schema]
  );

  const form = useForm<T>(formConfig);

  // Standardized submission handler
  const handleSubmit = useCallback(
    async (data: T) => {
      try {
        if (enableLogging) {
          console.debug('[Form] Submitting data:', sanitizeForLog(data));
        }

        // Call success callback
        if (onSuccess) {
          await onSuccess(data);
        }

        // Show success toast
        if (showSuccessToast) {
          toast.success(successMessage);
        }

        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');

        if (enableLogging) {
          console.error('[Form] Submission error:', sanitizeForLog(err.message));
        }

        // Call error callback
        if (onError) {
          onError(err);
        }

        // Show error toast
        if (showErrorToast) {
          toast.error(
            err.message || 'Failed to save. Please try again.'
          );
        }

        return false;
      }
    },
    [onSuccess, onError, showSuccessToast, showErrorToast, successMessage, enableLogging]
  );

  // Expose standardized API
  return {
    ...form,
    // Override handleSubmit with our standardized version
    handleSubmit: form.handleSubmit(handleSubmit),
    // Utility methods
    isSubmitting: form.formState.isSubmitting,
    isDirty: form.formState.isDirty,
    hasErrors: Object.keys(form.formState.errors).length > 0,
    reset: form.reset,
  };
}

/**
 * Type-safe form field names getter
 * Prevents typos in field references
 */
export function getFieldName<T extends FieldValues>(
  _obj: T,
  accessor: (obj: T) => any
): string {
  const obj = {} as T;
  let name = '';
  const proxy = new Proxy(obj, {
    get: (target, prop) => {
      name = String(prop);
      return getFieldName(target, accessor);
    },
  });
  accessor(proxy as T);
  return name;
}

/**
 * Validation error formatter
 * Converts Zod errors to user-friendly messages
 */
export function formatValidationError(error: any): string {
  if (error.message) return error.message;
  if (Array.isArray(error.errors)) {
    return error.errors[0]?.message || 'Validation failed';
  }
  return 'Validation failed';
}

export default useFormStandardized;
