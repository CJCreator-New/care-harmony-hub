/**
 * RecurrencePatternSelector.tsx
 * UI component for selecting appointment recurrence patterns
 * Part of Feature 1.3: Appointment Recurrence UI
 *
 * Supports: Daily, Weekly, Bi-weekly, Monthly recurrence
 * with per-week day selection and end-date constraints
 */

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Sonner, toast } from 'sonner';
import { ValidationError, sanitizeForLog } from '@/lib/sanitize.utils';

// Schema validation for recurrence pattern
export const RecurrencePatternSchema = z.object({
  type: z.enum(['daily', 'weekly', 'biweekly', 'monthly'], {
    errorMap: () => ({ message: 'Invalid recurrence type' }),
  }),
  interval: z.number().min(1).max(52, 'Interval must be 1-52 weeks'),
  daysOfWeek: z
    .array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']))
    .min(1, 'Select at least one day')
    .optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  endDate: z.date().optional(),
  maxOccurrences: z.number().min(1).max(156).optional(), // 3 years of weekly
  timezone: z.string().default('UTC'),
});

export type RecurrencePattern = z.infer<typeof RecurrencePatternSchema>;

interface RecurrencePatternSelectorProps {
  onPatternChange: (pattern: RecurrencePattern) => void;
  initialPattern?: RecurrencePattern;
  appointmentDate: Date;
  hospitalId: string;
}

const DAYS_OF_WEEK = [
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' },
];

export const RecurrencePatternSelector: React.FC<RecurrencePatternSelectorProps> = ({
  onPatternChange,
  initialPattern,
  appointmentDate,
  hospitalId,
}) => {
  const [recurrenceType, setRecurrenceType] = useState<string>(initialPattern?.type || 'weekly');
  const [showDaysOfWeek, setShowDaysOfWeek] = useState(initialPattern?.type === 'weekly' || initialPattern?.type === 'biweekly');

  const form = useForm<RecurrencePattern>({
    resolver: zodResolver(RecurrencePatternSchema),
    defaultValues: {
      type: (initialPattern?.type as any) || 'weekly',
      interval: initialPattern?.interval || 1,
      daysOfWeek: initialPattern?.daysOfWeek || [
        ['MON', 'WED', 'FRI'].includes(
          ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][appointmentDate.getDay()]
        )
          ? ['MON', 'WED', 'FRI'][0]
          : 'MON'
      ],
      dayOfMonth: initialPattern?.dayOfMonth || appointmentDate.getDate(),
      endDate: initialPattern?.endDate,
      maxOccurrences: initialPattern?.maxOccurrences || 12,
      timezone: initialPattern?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const onSubmit = async (data: RecurrencePattern) => {
    try {
      // Validate pattern constraints
      if (data.type === 'weekly' || data.type === 'biweekly') {
        if (!data.daysOfWeek || data.daysOfWeek.length === 0) {
          toast.error('Select at least one day for weekly recurrence');
          return;
        }
      }

      if (data.type === 'monthly' && !data.dayOfMonth) {
        toast.error('Select a day of month for monthly recurrence');
        return;
      }

      if (data.endDate && data.maxOccurrences && data.endDate < appointmentDate) {
        toast.error('End date must be after the appointment date');
        return;
      }

      // Sanitize sensitive data before logging
      const sanitized = sanitizeForLog({
        type: data.type,
        interval: data.interval,
        maxOccurrences: data.maxOccurrences,
      });

      console.log('Recurrence pattern configured:', sanitized);

      // Notify parent component
      onPatternChange(data);
      toast.success('Recurrence pattern configured successfully');
    } catch (error) {
      const message = error instanceof ValidationError ? error.message : 'Failed to configure recurrence pattern';
      toast.error(message);
      console.error('Recurrence pattern error:', sanitizeForLog(error));
    }
  };

  const handleRecurrenceTypeChange = (newType: string) => {
    setRecurrenceType(newType);
    setShowDaysOfWeek(newType === 'weekly' || newType === 'biweekly');
    form.setValue('type', newType as any);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Appointment Recurrence Pattern</CardTitle>
        <CardDescription>Set up recurring appointments with automatic scheduling</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Recurrence Type Selection */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recurrence Type</FormLabel>
                <Select
                  value={recurrenceType}
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleRecurrenceTypeChange(value);
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recurrence type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly (Every 2 weeks)</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose how often this appointment should repeat
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Days of Week Selection (Weekly/Bi-weekly only) */}
          {showDaysOfWeek && (
            <FormField
              control={form.control}
              name="daysOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Days of Week</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={day.value}
                          checked={field.value?.includes(day.value) || false}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            if (checked) {
                              field.onChange([...current, day.value]);
                            } else {
                              field.onChange(current.filter((d) => d !== day.value));
                            }
                          }}
                        />
                        <label
                          htmlFor={day.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {day.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormDescription>
                    Select which days this appointment should recur
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Day of Month Selection (Monthly only) */}
          {recurrenceType === 'monthly' && (
            <FormField
              control={form.control}
              name="dayOfMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day of Month</FormLabel>
                  <Select value={field.value?.toString()} onValueChange={(val) => field.onChange(parseInt(val))}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Recurrence will be on this day of each month
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* End Date Selection */}
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date (Optional)</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    minDate={appointmentDate}
                    placeholder="No end date (infinite)"
                  />
                </FormControl>
                <FormDescription>
                  Leave empty for infinite recurrence
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Max Occurrences as Alternative to End Date */}
          <FormField
            control={form.control}
            name="maxOccurrences"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Occurrences (Optional)</FormLabel>
                <Select
                  value={field.value?.toString()}
                  onValueChange={(val) => field.onChange(parseInt(val))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Unlimited" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="0">Unlimited</SelectItem>
                    {[4, 6, 12, 24, 52].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} times
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Stop after this many appointments (ignored if end date is set)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Timezone Selection */}
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Timezone</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">GMT</SelectItem>
                    <SelectItem value="Asia/Tokyo">JST</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Timezone for calculating recurrence boundaries
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <div className="flex gap-2">
            <Button type="submit" className="w-full">
              Save Recurrence Pattern
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default RecurrencePatternSelector;
