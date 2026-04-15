/**
 * AppointmentRecurrenceSettings.tsx
 * Main UI page for creating and managing recurring appointments
 * Part of Feature 1.3: Appointment Recurrence UI
 *
 * Integrates RecurrencePatternSelector + RecurrenceExceptionManager
 * Generates appointments and submits to backend Edge Function
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { useHospitalContext } from '@/hooks/useHospitalContext';
import { useHIPAACompliance } from '@/hooks/useHIPAACompliance';
import { generateRecurringAppointments } from '@/lib/recurrence.utils';
import { useQueryClient } from '@tanstack/react-query';
import { Sonner, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecurrencePatternSelector, RecurrencePattern } from './RecurrencePatternSelector';
import { RecurrenceExceptionManager } from './RecurrenceExceptionManager';
import { format, addDays, isBefore } from 'date-fns';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Calendar, Users, Clock } from 'lucide-react';
import { sanitizeForLog, ValidationError } from '@/lib/sanitize.utils';

// Schema validation for full recurrence setup
export const RecurrenceSetupSchema = z.object({
  baseAppointmentId: z.string().uuid('Valid appointment ID required'),
  patientId: z.string().uuid('Valid patient ID required'),
  doctorId: z.string().uuid('Valid doctor ID required'),
  appointmentDate: z.date({ errorMap: () => ({ message: 'Valid appointment date required' }) }),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time format: HH:MM'),
  recurrencePattern: RecurrencePatternSchema,
  exceptions: z.array(z.date()).default([]),
  notes: z.string().max(500).optional(),
  slotDurationMinutes: z.number().min(15).max(480),
  roomId: z.string().uuid().optional(),
  recurringSeriesName: z.string().max(100).optional(),
});

const RecurrencePatternSchema = z.object({
  type: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
  interval: z.number().min(1),
  daysOfWeek: z.array(z.string()).optional(),
  dayOfMonth: z.number().optional(),
  endDate: z.date().optional(),
  maxOccurrences: z.number().optional(),
  timezone: z.string(),
});

export type RecurrenceSetup = z.infer<typeof RecurrenceSetupSchema>;

interface AppointmentRecurrenceSettingsProps {
  baseAppointmentId?: string;
  onSuccess?: (recurrenceId: string, appointmentIds: string[]) => void;
  onCancel?: () => void;
}

export const AppointmentRecurrenceSettings: React.FC<AppointmentRecurrenceSettingsProps> = ({
  baseAppointmentId,
  onSuccess,
  onCancel,
}) => {
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern | null>(null);
  const [exceptions, setExceptions] = useState<Date[]>([]);
  const [generatedDates, setGeneratedDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  const { canEditAppointments } = usePermissions();
  const { hospitalId } = useHospitalContext();
  const { encrypt } = useHIPAACompliance();
  const queryClient = useQueryClient();

  const form = useForm<RecurrenceSetup>({
    resolver: zodResolver(RecurrenceSetupSchema),
    defaultValues: {
      baseAppointmentId: baseAppointmentId || '',
      patientId: '',
      doctorId: '',
      appointmentDate: new Date(),
      appointmentTime: '09:00',
      slotDurationMinutes: 30,
      recurringSeriesName: `Recurring Series - ${format(new Date(), 'MMM dd, yyyy')}`,
      notes: '',
    },
  });

  // Generate preview dates when pattern changes
  useEffect(() => {
    if (recurrencePattern && form.getValues('appointmentDate')) {
      try {
        const appointmentDate = form.getValues('appointmentDate');
        const pattern = recurrencePattern;

        // Generate recurring dates
        const dates = generateRecurringAppointments(appointmentDate, pattern);
        setGeneratedDates(dates);

        console.log('Generated dates:', sanitizeForLog({
          count: dates.length,
          type: pattern.type,
          firstDate: format(dates[0], 'yyyy-MM-dd'),
          lastDate: format(dates[dates.length - 1], 'yyyy-MM-dd'),
        }));
      } catch (error) {
        console.error('Date generation error:', sanitizeForLog(error));
      }
    }
  }, [recurrencePattern, form]);

  const onSubmit = async (data: RecurrenceSetup) => {
    try {
      if (!canEditAppointments) {
        toast.error('You do not have permission to create recurring appointments');
        return;
      }

      if (generatedDates.length === 0) {
        toast.error('No valid appointment dates generated. Please check your recurrence pattern.');
        return;
      }

      if (exceptions.length > 0 && exceptions.length === generatedDates.length) {
        toast.error('All generated dates are marked as exceptions. Please add at least one valid date.');
        return;
      }

      setIsLoading(true);

      // Filter out exception dates
      const appointmentDates = generatedDates.filter(
        (date) =>
          !exceptions.some(
            (ex) => format(ex, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
          )
      );

      // Prepare recurrence data with encrypted sensitive fields
      const [hours, minutes] = data.appointmentTime.split(':').map(Number);
      const baseTime = new Date(data.appointmentDate);
      baseTime.setHours(hours, minutes, 0, 0);

      const recurrenceData = {
        hospital_id: hospitalId,
        base_appointment_id: data.baseAppointmentId,
        patient_id: data.patientId,
        doctor_id: data.doctorId,
        recurring_series_name: data.recurringSeriesName,
        pattern_type: recurrencePattern!.type,
        pattern_interval: recurrencePattern!.interval,
        pattern_days_of_week: recurrencePattern!.daysOfWeek || null,
        pattern_day_of_month: recurrencePattern!.dayOfMonth || null,
        pattern_end_date: recurrencePattern!.endDate || null,
        pattern_max_occurrences: recurrencePattern!.maxOccurrences || null,
        pattern_timezone: recurrencePattern!.timezone,
        exception_dates: exceptions.map((d) => format(d, 'yyyy-MM-dd')),
        total_appointments: appointmentDates.length,
        slot_duration_minutes: data.slotDurationMinutes,
        room_id: data.roomId || null,
        notes: data.notes || null,
        appointment_dates: appointmentDates.map((d) => ({
          date: format(d, 'yyyy-MM-dd'),
          time: format(baseTime, 'HH:mm:ss'),
        })),
        created_at: new Date().toISOString(),
      };

      // Encrypt sensitive fields
      const encryptedNotes = data.notes ? encrypt(data.notes) : null;

      // Call Edge Function to create recurring appointments
      const { data: result, error } = await supabase.functions.invoke(
        'generate-recurring-appointments',
        {
          body: {
            ...recurrenceData,
            encrypted_notes: encryptedNotes,
            hospital_id: hospitalId,
          },
        }
      );

      if (error) {
        throw new Error(error.message || 'Failed to create recurring appointments');
      }

      // Audit log
      console.log('Recurring series created:', sanitizeForLog({
        seriesName: data.recurringSeriesName,
        appointmentCount: appointmentDates.length,
        exceptionCount: exceptions.length,
        patientId: data.patientId,
        doctorId: data.doctorId,
      }));

      // Invalidate appointments query to refresh UI
      await queryClient.invalidateQueries({ queryKey: ['appointments', hospitalId] });

      toast.success(`Created ${appointmentDates.length} recurring appointments`);

      // Notify parent component
      if (onSuccess) {
        onSuccess(result.recurrence_id, result.appointment_ids);
      }
    } catch (error) {
      const message = error instanceof ValidationError ? error.message : 'Failed to create recurring appointments';
      toast.error(message);
      console.error('Recurrence setup error:', sanitizeForLog(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create Recurring Appointments
          </CardTitle>
          <CardDescription>
            Set up a series of appointments with automatic scheduling and exception management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Details</TabsTrigger>
                <TabsTrigger value="pattern">Recurrence Pattern</TabsTrigger>
                <TabsTrigger value="exceptions">Exceptions & Preview</TabsTrigger>
              </TabsList>

              {/* TAB 1: Basic Details */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="recurringSeriesName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Series Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Weekly Check-up - John Doe"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormDescription>
                        Name for this recurring appointment series
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Patient</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Patient ID"
                          disabled={isLoading}
                          type="hidden"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="doctorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doctor</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Doctor ID"
                          disabled={isLoading}
                          type="hidden"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="appointmentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            minDate={new Date()}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="appointmentTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="time"
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="slotDurationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointment Duration</FormLabel>
                      <Select
                        value={field.value.toString()}
                        onValueChange={(val) => field.onChange(parseInt(val))}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[15, 30, 45, 60, 90, 120].map((min) => (
                            <SelectItem key={min} value={min.toString()}>
                              {min} minutes
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Additional instructions or notes for this recurring series..."
                          disabled={isLoading}
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* TAB 2: Recurrence Pattern */}
              <TabsContent value="pattern" className="mt-4">
                <RecurrencePatternSelector
                  onPatternChange={setRecurrencePattern}
                  appointmentDate={form.getValues('appointmentDate')}
                  hospitalId={hospitalId}
                />
              </TabsContent>

              {/* TAB 3: Exceptions & Preview */}
              <TabsContent value="exceptions" className="space-y-4 mt-4">
                {recurrencePattern ? (
                  <>
                    <RecurrenceExceptionManager
                      recurrenceId="new"
                      appointmentDate={form.getValues('appointmentDate')}
                      generatedDates={generatedDates}
                      onExceptionsChange={setExceptions}
                      hospitalId={hospitalId}
                      doctorId={form.getValues('doctorId')}
                    />

                    {/* Preview of Generated Dates */}
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Preview ({generatedDates.length - exceptions.length} appointments)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {generatedDates.length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-sm text-slate-600 mb-3">
                              {generatedDates.length} total dates generated
                              {exceptions.length > 0 && ` • ${exceptions.length} exceptions`}
                            </div>
                            <div className="max-h-[300px] overflow-y-auto space-y-1">
                              {generatedDates.map((date, idx) => {
                                const isException = exceptions.some(
                                  (ex) => format(ex, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                                );
                                return (
                                  <div
                                    key={idx}
                                    className={`text-xs p-2 rounded ${
                                      isException
                                        ? 'bg-red-100 text-red-700 line-through'
                                        : 'bg-green-100 text-green-700'
                                    }`}
                                  >
                                    {format(date, 'EEE, MMM dd, yyyy')} at{' '}
                                    {format(new Date(form.getValues('appointmentDate').getTime() +
                                      parseInt(form.getValues('appointmentTime').split(':')[0]) * 3600000 +
                                      parseInt(form.getValues('appointmentTime').split(':')[1]) * 60000), 'hh:mm a')}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Configure a recurrence pattern to see preview
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please configure a recurrence pattern in the previous tab
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  !recurrencePattern ||
                  generatedDates.length === 0
                }
              >
                {isLoading ? 'Creating...' : `Create ${generatedDates.length - exceptions.length} Appointments`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentRecurrenceSettings;
