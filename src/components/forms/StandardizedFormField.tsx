/**
 * StandardizedFormField Component
 * 
 * Unified form field wrapper enforcing:
 * - Consistent error displays
 * - Clinical validation patterns
 * - Accessibility requirements
 * - PHI safety (no console logs)
 */

import React from 'react';
import { FieldError, FieldPath, FieldValues } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormMessage, FormControl, FormDescription } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface StandardizedFormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  /** Form control from useForm */
  control: any;
  /** Field name (type-safe) */
  name: TName;
  /** Field label */
  label: string;
  /** Help text below input */
  description?: string;
  /** Input component */
  children: React.ReactNode;
  /** Custom error message override */
  errorMessage?: string;
  /** Mark as required visually */
  required?: boolean;
  /** Field type for aria-* attributes */
  type?: string;
  /** Additional wrapper classes */
  className?: string;
}

/**
 * Standardized form field wrapper
 * Replaces repetitive FormField/FormItem/FormLabel/FormMessage patterns
 */
export const StandardizedFormField = React.forwardRef<
  HTMLDivElement,
  StandardizedFormFieldProps
>(({
  control,
  name,
  label,
  description,
  children,
  errorMessage,
  required = false,
  type,
  className,
}, ref) => {
  return (
    <FormField
      control={control}
      name={name as any}
      render={({ field, fieldState: { error } }) => (
        <FormItem ref={ref} className={className}>
          <div className="flex items-center gap-2">
            <FormLabel className={cn(
              'text-sm font-medium',
              error && 'text-red-600'
            )}>
              {label}
            </FormLabel>
            {required && (
              <span className="text-red-500 font-bold" aria-label="required">
                *
              </span>
            )}
            {error && (
              <AlertCircle className="w-4 h-4 text-red-500" aria-hidden="true" />
            )}
          </div>

          {description && (
            <FormDescription className="text-xs text-gray-600 mt-1">
              {description}
            </FormDescription>
          )}

          <FormControl>
            <div 
              className={cn(
                'relative',
                error && 'has-error'
              )}
              role={type === 'textbox' ? 'group' : undefined}
              aria-label={label}
            >
              {typeof children === 'function' 
                ? (children as any)({ ...field, error })
                : children
              }
            </div>
          </FormControl>

          {(error || errorMessage) && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <FormMessage className="text-red-700 text-sm font-medium flex items-center gap-2">
                <span className="shrink-0">⚠️</span>
                {errorMessage || error?.message}
              </FormMessage>
            </div>
          )}
        </FormItem>
      )}
    />
  );
});

StandardizedFormField.displayName = 'StandardizedFormField';

export default StandardizedFormField;
