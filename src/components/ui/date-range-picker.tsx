import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  maxDays?: number;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  maxDays = 365,
  placeholder = 'Select date range',
  className,
}: DateRangePickerProps) {
  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const diff = differenceInCalendarDays(range.to, range.from);
      if (diff > maxDays) {
        const cappedTo = addDays(range.from, maxDays);
        toast.warning(`Date range capped at ${maxDays} days.`);
        onChange({ from: range.from, to: cappedTo });
        return;
      }
    }
    onChange(range);
  };

  const label = value?.from
    ? value.to
      ? `${format(value.from, 'MMM dd, yyyy')} - ${format(value.to, 'MMM dd, yyyy')}`
      : format(value.from, 'MMM dd, yyyy')
    : placeholder;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('justify-start text-left font-normal', className)}
          aria-label="Select date range"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className={cn(!value?.from && 'text-muted-foreground')}>{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          numberOfMonths={2}
          selected={value}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}
