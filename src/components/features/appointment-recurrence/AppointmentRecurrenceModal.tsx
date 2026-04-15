import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Sonner } from 'sonner';

// Schema for recurrence pattern
const RecurrencePatternSchema = z.object({
  appointmentId: z.string().uuid(),
  patternType: z.enum(['daily', 'weekly', 'bi_weekly', 'monthly', 'custom']),
  recurrenceRule: z.record(z.any()),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  maxOccurrences: z.number().int().positive().optional(),
  exceptions: z.array(z.string()).optional(),
});

type RecurrencePatternFormData = z.infer<typeof RecurrencePatternSchema>;

export const AppointmentRecurrenceModal: React.FC<{
  appointmentId: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ appointmentId, onClose, onSuccess }) => {
  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<string>('weekly');

  const { register, handleSubmit, formState: { errors } } = useForm<RecurrencePatternFormData>({
    resolver: zodResolver(RecurrencePatternSchema),
    defaultValues: {
      appointmentId,
      patternType: 'weekly',
    },
  });

  const { mutate: createRecurrence, isPending } = useMutation({
    mutationFn: async (data: RecurrencePatternFormData) => {
      const { error } = await supabase
        .from('appointment_recurrence_patterns')
        .insert([{
          appointment_id: data.appointmentId,
          pattern_type: data.patternType,
          recurrence_rule: data.recurrenceRule,
          start_date: data.startDate,
          end_date: data.endDate,
          max_occurrences: data.maxOccurrences,
          exceptions: data.exceptions,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      Sonner.success('Recurrence pattern created successfully');
      onSuccess();
    },
    onError: (error) => {
      Sonner.error('Failed to create recurrence pattern: ' + (error as Error).message);
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Set Appointment Recurrence</h2>
        
        <form onSubmit={handleSubmit((data) => createRecurrence(data))} className="space-y-4">
          {/* Pattern Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Recurrence Pattern</label>
            <select
              {...register('patternType')}
              className="w-full border border-gray-300 rounded px-3 py-2"
              onChange={(e) => setSelectedPattern(e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="bi_weekly">Bi-Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
            {errors.patternType && <p className="text-red-500 text-sm">{errors.patternType.message}</p>}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="datetime-local"
              {...register('startDate')}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            {errors.startDate && <p className="text-red-500 text-sm">{errors.startDate.message}</p>}
          </div>

          {/* End Date (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">End Date (Optional)</label>
            <input
              type="datetime-local"
              {...register('endDate')}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          {/* Max Occurrences (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">Max Occurrences (Optional)</label>
            <input
              type="number"
              {...register('maxOccurrences', { valueAsNumber: true })}
              className="w-full border border-gray-300 rounded px-3 py-2"
              min="1"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create Recurrence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentRecurrenceModal;
