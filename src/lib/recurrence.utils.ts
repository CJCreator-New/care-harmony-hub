import { addDays, addWeeks, addMonths, isAfter, isBefore, parseISO } from 'date-fns';

export enum RecurrenceType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BI_WEEKLY = 'bi_weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export interface RecurrenceRule {
  interval?: number;
  dayOfWeek?: string[];
  dayOfMonth?: number;
  monthlyOn?: 'day' | 'date';
  [key: string]: any;
}

export interface RecurrenceConfig {
  type: RecurrenceType;
  rule: RecurrenceRule;
  startDate: Date;
  endDate?: Date;
  maxOccurrences?: number;
  exceptions?: Date[];
}

/**
 * Calculate the next occurrence date based on recurrence pattern
 */
export const calculateNextOccurrence = (
  currentDate: Date,
  config: RecurrenceConfig
): Date | null => {
  const { type, rule, endDate, maxOccurrences, exceptions } = config;
  
  let nextDate: Date;

  switch (type) {
    case RecurrenceType.DAILY:
      nextDate = addDays(currentDate, rule.interval || 1);
      break;
    
    case RecurrenceType.WEEKLY:
      nextDate = addWeeks(currentDate, rule.interval || 1);
      break;
    
    case RecurrenceType.BI_WEEKLY:
      nextDate = addWeeks(currentDate, 2);
      break;
    
    case RecurrenceType.MONTHLY:
      nextDate = addMonths(currentDate, rule.interval || 1);
      break;
    
    default:
      return null;
  }

  // Check if next occurrence is within valid range
  if (endDate && isAfter(nextDate, endDate)) {
    return null;
  }

  // Check exceptions
  if (exceptions?.some(exc => exc.toDateString() === nextDate.toDateString())) {
    return calculateNextOccurrence(nextDate, config);
  }

  return nextDate;
};

/**
 * Generate a series of occurrences for a recurrence pattern
 */
export const generateOccurrences = (
  startDate: Date,
  config: RecurrenceConfig,
  limit: number = 30
): Date[] => {
  const occurrences: Date[] = [];
  let currentDate = startDate;
  let count = 0;

  while (count < (config.maxOccurrences || limit)) {
    occurrences.push(currentDate);
    
    const nextDate = calculateNextOccurrence(currentDate, config);
    if (!nextDate) break;
    
    currentDate = nextDate;
    count++;
  }

  return occurrences;
};

/**
 * Detect scheduling conflicts with existing appointments
 */
export const detectSchedulingConflicts = (
  newDate: Date,
  existingAppointments: Array<{ start: Date; end: Date }>
): boolean => {
  return existingAppointments.some(apt => {
    return (
      isBefore(newDate, apt.end) &&
      isAfter(newDate, apt.start)
    );
  });
};

/**
 * Apply exceptions (holidays, manual blocks) to occurrence list
 */
export const applyExceptions = (
  occurrences: Date[],
  exceptions: Date[]
): Date[] => {
  return occurrences.filter(
    occ => !exceptions.some(exc => exc.toDateString() === occ.toDateString())
  );
};

/**
 * Calculate no-show rate for a patient
 */
export const calculateNoShowRate = (
  totalAppointments: number,
  noShowCount: number
): number => {
  if (totalAppointments === 0) return 0;
  return (noShowCount / totalAppointments) * 100;
};

export default {
  calculateNextOccurrence,
  generateOccurrences,
  detectSchedulingConflicts,
  applyExceptions,
  calculateNoShowRate,
};
