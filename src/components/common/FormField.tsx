import * as React from 'react';
import type { Control, ControllerRenderProps, FieldPath, FieldValues } from 'react-hook-form';

import {
  FormDescription,
  FormField as RHFFormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from '@/components/ui/form';

/** Props to spread on the input (or Select trigger) so it is linked to its label and error. */
export interface FormControlProps {
  id: string;
  'aria-describedby': string;
  'aria-invalid': boolean;
  'aria-required': true | undefined;
}

export interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  /** Field name in the react-hook-form values object. */
  name: TName;
  /** Visible label text. */
  label: React.ReactNode;
  /** Shows the required marker and sets aria-required on the control. */
  required?: boolean;
  /** Optional helper text, linked to the control through aria-describedby. */
  description?: React.ReactNode;
  /** Optional explicit control; defaults to the nearest react-hook-form context. */
  control?: Control<TFieldValues, any, any>;
  className?: string;
  /**
   * Renders the control. Spread `field` (value, onChange, onBlur, ref, name) and
   * `controlProps` (id, aria-describedby, aria-invalid, aria-required) onto it.
   * Works for any single input-like element, including a SelectTrigger.
   */
  children: (
    field: ControllerRenderProps<TFieldValues, TName>,
    controlProps: FormControlProps
  ) => React.ReactElement;
}

/** Reads the item context created by FormItem and computes the control's ARIA wiring. */
function FieldControl<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
  field,
  required,
  hasDescription,
  render,
}: {
  field: ControllerRenderProps<TFieldValues, TName>;
  required: boolean;
  hasDescription: boolean;
  render: FormFieldProps<TFieldValues, TName>['children'];
}) {
  const { formItemId, formDescriptionId, formMessageId, error } = useFormField();
  const describedBy = [hasDescription ? formDescriptionId : null, error ? formMessageId : null]
    .filter(Boolean)
    .join(' ');
  return render(field, {
    id: formItemId,
    'aria-describedby': describedBy,
    'aria-invalid': !!error,
    'aria-required': required ? true : undefined,
  });
}

/**
 * Shared form field for react-hook-form forms.
 *
 * - Label with a visual `*` marker and screen-reader "(required)" text when `required`.
 * - Optional description, and the inline error message from the form state.
 * - The control receives id, aria-describedby (description and error ids),
 *   aria-invalid and aria-required, so the error text is programmatically linked.
 *
 * @example
 *   <FormField control={form.control} name="first_name" label="First name" required>
 *     {(field, controlProps) => <Input {...field} {...controlProps} />}
 *   </FormField>
 */
export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  label,
  required = false,
  description,
  control,
  className,
  children,
}: FormFieldProps<TFieldValues, TName>) {
  const hasDescription = description !== undefined && description !== null && description !== false;
  return (
    <RHFFormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && (
              <>
                <span aria-hidden="true" className="ml-0.5 text-destructive">
                  *
                </span>
                <span className="sr-only"> (required)</span>
              </>
            )}
          </FormLabel>
          {hasDescription && <FormDescription>{description}</FormDescription>}
          <FieldControl
            field={field}
            required={required}
            hasDescription={hasDescription}
            render={children}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default FormField;
