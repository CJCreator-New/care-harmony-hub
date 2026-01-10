import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, Repeat, AlertCircle } from 'lucide-react';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { 
  RecurringAppointment, 
  APPOINTMENT_TYPES, 
  RECURRENCE_PATTERNS, 
  DAYS_OF_WEEK 
} from '@/types/scheduling';

interface RecurringAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  availableDoctors: any[];
  onSave: (recurring: Partial<RecurringAppointment>) => void;
}

export const RecurringAppointmentModal: React.FC<RecurringAppointmentModalProps> = ({
  isOpen,
  onClose,
  patientId,
  availableDoctors,
  onSave
}) => {
  const [recurring, setRecurring] = useState<Partial<RecurringAppointment>>({
    patient_id: patientId,
    pattern_type: 'weekly',
    interval_value: 1,
    days_of_week: [],
    duration_minutes: 30,
    preferred_time: '09:00',
    status: 'active'
  });

  const [dateRange, setDateRange] = useState<{start?: Date, end?: Date}>({});
  const [previewDates, setPreviewDates] = useState<Date[]>([]);

  const handlePatternChange = (pattern: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    setRecurring(prev => ({
      ...prev,
      pattern_type: pattern,
      days_of_week: pattern === 'weekly' ? [] : undefined,
      day_of_month: pattern === 'monthly' ? 1 : undefined
    }));
  };

  const handleDayToggle = (day: number) => {
    const days = recurring.days_of_week || [];
    setRecurring(prev => ({
      ...prev,
      days_of_week: days.includes(day)
        ? days.filter(d => d !== day)
        : [...days, day].sort()
    }));
  };

  const generatePreviewDates = () => {
    if (!dateRange.start || !recurring.pattern_type) return [];

    const dates: Date[] = [];
    let currentDate = new Date(dateRange.start);
    const endDate = dateRange.end || addMonths(dateRange.start, 3); // Default 3 months preview
    const maxDates = 10; // Limit preview to 10 dates

    while (currentDate <= endDate && dates.length < maxDates) {
      if (recurring.pattern_type === 'weekly' && recurring.days_of_week?.length) {
        // For weekly pattern with specific days
        const dayOfWeek = currentDate.getDay();
        if (recurring.days_of_week.includes(dayOfWeek)) {
          dates.push(new Date(currentDate));
        }
        currentDate = addDays(currentDate, 1);
      } else {
        // For other patterns
        dates.push(new Date(currentDate));
        
        switch (recurring.pattern_type) {
          case 'daily':
            currentDate = addDays(currentDate, recurring.interval_value || 1);
            break;
          case 'weekly':
            currentDate = addWeeks(currentDate, recurring.interval_value || 1);
            break;
          case 'monthly':
            currentDate = addMonths(currentDate, recurring.interval_value || 1);
            break;
          case 'yearly':
            currentDate = addYears(currentDate, recurring.interval_value || 1);
            break;
        }
      }
    }

    setPreviewDates(dates);
  };

  const handleSave = () => {
    if (!dateRange.start || !recurring.appointment_type || !recurring.doctor_id) return;

    onSave({
      ...recurring,
      series_start_date: dateRange.start.toISOString().split('T')[0],
      series_end_date: dateRange.end?.toISOString().split('T')[0]
    });
    onClose();
  };

  React.useEffect(() => {
    generatePreviewDates();
  }, [recurring.pattern_type, recurring.interval_value, recurring.days_of_week, dateRange]);

  const getPatternDescription = () => {
    const { pattern_type, interval_value, days_of_week, day_of_month } = recurring;
    
    switch (pattern_type) {
      case 'daily':
        return interval_value === 1 ? 'Every day' : `Every ${interval_value} days`;
      case 'weekly':
        if (days_of_week?.length) {
          const dayNames = days_of_week.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.short).join(', ');
          return `Every ${interval_value === 1 ? '' : interval_value + ' '}week(s) on ${dayNames}`;
        }
        return interval_value === 1 ? 'Every week' : `Every ${interval_value} weeks`;
      case 'monthly':
        const dayText = day_of_month ? `on the ${day_of_month}${getOrdinalSuffix(day_of_month)}` : '';
        return `Every ${interval_value === 1 ? '' : interval_value + ' '}month(s) ${dayText}`;
      case 'yearly':
        return interval_value === 1 ? 'Every year' : `Every ${interval_value} years`;
      default:
        return '';
    }
  };

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Schedule Recurring Appointments
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="appointment-type">Appointment Type</Label>
              <Select 
                value={recurring.appointment_type} 
                onValueChange={(value) => setRecurring(prev => ({ ...prev, appointment_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="doctor">Doctor</Label>
              <Select 
                value={recurring.doctor_id} 
                onValueChange={(value) => setRecurring(prev => ({ ...prev, doctor_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {availableDoctors.map(doctor => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr. {doctor.first_name} {doctor.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Timing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="preferred-time">Preferred Time</Label>
              <Input
                id="preferred-time"
                type="time"
                value={recurring.preferred_time}
                onChange={(e) => setRecurring(prev => ({ ...prev, preferred_time: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Select 
                value={recurring.duration_minutes?.toString()} 
                onValueChange={(value) => setRecurring(prev => ({ ...prev, duration_minutes: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recurrence Pattern */}
          <div className="space-y-4">
            <Label>Recurrence Pattern</Label>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {RECURRENCE_PATTERNS.map(pattern => (
                <Button
                  key={pattern.value}
                  variant={recurring.pattern_type === pattern.value ? 'default' : 'outline'}
                  onClick={() => handlePatternChange(pattern.value as any)}
                  className="h-auto p-3"
                >
                  {pattern.label}
                </Button>
              ))}
            </div>

            {/* Interval */}
            <div className="flex items-center gap-2">
              <Label htmlFor="interval">Repeat every</Label>
              <Input
                id="interval"
                type="number"
                min="1"
                max="12"
                value={recurring.interval_value}
                onChange={(e) => setRecurring(prev => ({ ...prev, interval_value: parseInt(e.target.value) }))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">
                {recurring.pattern_type}(s)
              </span>
            </div>

            {/* Weekly - Days of Week */}
            {recurring.pattern_type === 'weekly' && (
              <div>
                <Label>Days of the Week</Label>
                <div className="grid grid-cols-7 gap-1 mt-2">
                  {DAYS_OF_WEEK.map(day => (
                    <Button
                      key={day.value}
                      variant={recurring.days_of_week?.includes(day.value) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleDayToggle(day.value)}
                      className="h-10"
                    >
                      {day.short}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly - Day of Month */}
            {recurring.pattern_type === 'monthly' && (
              <div>
                <Label htmlFor="day-of-month">Day of Month</Label>
                <Input
                  id="day-of-month"
                  type="number"
                  min="1"
                  max="31"
                  value={recurring.day_of_month}
                  onChange={(e) => setRecurring(prev => ({ ...prev, day_of_month: parseInt(e.target.value) }))}
                  className="w-20"
                />
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="space-y-4">
            <Label>Series Duration</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.start ? format(dateRange.start, 'PPP') : 'Select start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.start}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>End Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.end ? format(dateRange.end, 'PPP') : 'No end date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.end}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                      disabled={(date) => date < new Date() || (dateRange.start && date <= dateRange.start)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Max Occurrences */}
            <div>
              <Label htmlFor="max-occurrences">Maximum Appointments (Optional)</Label>
              <Input
                id="max-occurrences"
                type="number"
                min="1"
                value={recurring.max_occurrences || ''}
                onChange={(e) => setRecurring(prev => ({ 
                  ...prev, 
                  max_occurrences: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
                placeholder="Leave empty for no limit"
              />
            </div>
          </div>

          {/* Pattern Summary */}
          {recurring.pattern_type && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Pattern Summary</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                {getPatternDescription()} at {recurring.preferred_time}
              </p>
            </div>
          )}

          {/* Preview Dates */}
          {previewDates.length > 0 && (
            <div>
              <Label>Preview - Next {previewDates.length} Appointments</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {previewDates.map((date, index) => (
                  <Badge key={index} variant="outline">
                    {format(date, 'MMM d, yyyy')}
                  </Badge>
                ))}
              </div>
              {previewDates.length === 10 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Showing first 10 appointments only
                </p>
              )}
            </div>
          )}

          {/* Reason for Visit */}
          <div>
            <Label htmlFor="reason">Reason for Visit</Label>
            <Textarea
              id="reason"
              value={recurring.reason_for_visit || ''}
              onChange={(e) => setRecurring(prev => ({ ...prev, reason_for_visit: e.target.value }))}
              placeholder="Brief description for all appointments in this series..."
              rows={2}
            />
          </div>

          {/* Warning */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Important</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Recurring appointments will be automatically scheduled based on availability. 
              You'll be notified if any conflicts arise.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!dateRange.start || !recurring.appointment_type || !recurring.doctor_id}
          >
            Create Recurring Series
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};