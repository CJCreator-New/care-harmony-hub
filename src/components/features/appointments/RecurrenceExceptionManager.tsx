/**
 * RecurrenceExceptionManager.tsx
 * UI component for managing appointment recurrence exceptions
 * Part of Feature 1.3: Appointment Recurrence UI
 *
 * Allows adding/removing exception dates for skipped appointments
 * in recurring series (e.g., holidays, doctor availability)
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Sonner, toast } from 'sonner';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { sanitizeForLog, ValidationError } from '@/lib/sanitize.utils';

// Schema validation for exception management
export const ExceptionSchema = z.object({
  exceptionDate: z.date({
    errorMap: () => ({ message: 'Valid exception date required' }),
  }),
  reason: z.string().max(200).optional(),
});

export type Exception = z.infer<typeof ExceptionSchema>;

interface RecurrenceExceptionManagerProps {
  recurrenceId: string;
  appointmentDate: Date;
  generatedDates: Date[]; // All generated appointment dates from the recurrence pattern
  onExceptionsChange: (exceptions: Date[]) => void;
  initialExceptions?: Date[];
  hospitalId: string;
  doctorId: string;
}

export const RecurrenceExceptionManager: React.FC<RecurrenceExceptionManagerProps> = ({
  recurrenceId,
  appointmentDate,
  generatedDates,
  onExceptionsChange,
  initialExceptions = [],
  hospitalId,
  doctorId,
}) => {
  const [exceptions, setExceptions] = useState<Date[]>(initialExceptions);
  const [reasons, setReasons] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<Exception>({
    resolver: zodResolver(ExceptionSchema),
    defaultValues: {
      exceptionDate: undefined,
      reason: '',
    },
  });

  const handleAddException = async (data: Exception) => {
    try {
      setIsLoading(true);

      // Validate exception date is within generated series
      const dateKey = format(data.exceptionDate, 'yyyy-MM-dd');
      const isValidDate = generatedDates.some(
        (d) => format(d, 'yyyy-MM-dd') === dateKey
      );

      if (!isValidDate) {
        toast.error('Exception date must be an existing appointment in the series');
        setIsLoading(false);
        return;
      }

      // Check if exception already exists
      if (exceptions.some((e) => format(e, 'yyyy-MM-dd') === dateKey)) {
        toast.warning('This date is already marked as an exception');
        setIsLoading(false);
        return;
      }

      // Add the exception
      const updatedExceptions = [...exceptions, data.exceptionDate];
      setExceptions(updatedExceptions);

      // Store reason if provided
      if (data.reason) {
        setReasons(new Map(reasons).set(dateKey, data.reason));
      }

      // Notify parent component
      onExceptionsChange(updatedExceptions);

      // Log exception addition (sanitized)
      console.log('Exception added:', sanitizeForLog({
        date: dateKey,
        reasonLength: data.reason?.length || 0,
        totalExceptions: updatedExceptions.length,
      }));

      toast.success(`Exception added for ${format(data.exceptionDate, 'MMM dd, yyyy')}`);
      form.reset();
    } catch (error) {
      const message = error instanceof ValidationError ? error.message : 'Failed to add exception';
      toast.error(message);
      console.error('Exception add error:', sanitizeForLog(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveException = async (exceptionDate: Date) => {
    try {
      setIsLoading(true);
      const dateKey = format(exceptionDate, 'yyyy-MM-dd');

      const updatedExceptions = exceptions.filter(
        (e) => format(e, 'yyyy-MM-dd') !== dateKey
      );

      setExceptions(updatedExceptions);

      // Remove reason if it exists
      const newReasons = new Map(reasons);
      newReasons.delete(dateKey);
      setReasons(newReasons);

      // Notify parent component
      onExceptionsChange(updatedExceptions);

      console.log('Exception removed:', sanitizeForLog({ date: dateKey }));
      toast.success(`Exception removed for ${format(exceptionDate, 'MMM dd, yyyy')}`);
    } catch (error) {
      const message = error instanceof ValidationError ? error.message : 'Failed to remove exception';
      toast.error(message);
      console.error('Exception remove error:', sanitizeForLog(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate upcomming exceptions for display
  const upcomingExceptions = exceptions
    .filter((e) => e > new Date())
    .sort((a, b) => a.getTime() - b.getTime());

  const pastExceptions = exceptions
    .filter((e) => e <= new Date())
    .sort((a, b) => b.getTime() - a.getTime());

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Recurrence Exceptions</CardTitle>
        <CardDescription>
          Temporarily skip appointments or mark dates as unavailable
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alert about when exceptions are useful */}
        {exceptions.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Add exceptions for dates when this appointment should be skipped (e.g., holidays, doctor
              unavailability, or patient requests).
            </AlertDescription>
          </Alert>
        )}

        {/* Add Exception Form */}
        <form onSubmit={form.handleSubmit(handleAddException)} className="space-y-4 p-4 bg-slate-50 rounded-lg border">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-4 w-4" />
            <h3 className="font-medium">Add Exception</h3>
          </div>

          <FormField
            control={form.control}
            name="exceptionDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Exception Date</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    minDate={appointmentDate}
                    placeholder="Select a date to skip"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormDescription>
                  Must be one of the generated appointment dates in this series
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason (Optional)</FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    placeholder="e.g., Doctor vacation, Holiday, Patient request"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Adding...' : 'Add Exception'}
          </Button>
        </form>

        {/* Display Upcoming Exceptions */}
        {upcomingExceptions.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Upcoming Exceptions ({upcomingExceptions.length})</h3>
            <div className="space-y-2">
              {upcomingExceptions.map((exception) => {
                const dateKey = format(exception, 'yyyy-MM-dd');
                const reason = reasons.get(dateKey);
                return (
                  <div
                    key={dateKey}
                    className="flex items-start justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {format(exception, 'EEEE, MMMM dd, yyyy')}
                      </div>
                      {reason && (
                        <div className="text-sm text-slate-600 mt-1">
                          {reason}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveException(exception)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Display Past Exceptions */}
        {pastExceptions.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Past Exceptions ({pastExceptions.length})</h3>
            <div className="flex flex-wrap gap-2">
              {pastExceptions.map((exception) => {
                const dateKey = format(exception, 'yyyy-MM-dd');
                const reason = reasons.get(dateKey);
                return (
                  <Badge
                    key={dateKey}
                    variant="secondary"
                    className="py-2 px-3 text-xs"
                    title={reason || 'No reason provided'}
                  >
                    {format(exception, 'MMM dd')}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary */}
        {exceptions.length > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm">
              <strong>{exceptions.length} exception{exceptions.length !== 1 ? 's' : ''}</strong> configured
              {upcomingExceptions.length > 0 &&
                ` • ${upcomingExceptions.length} upcoming`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecurrenceExceptionManager;
