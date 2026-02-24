import { describe, it, expect } from 'vitest';

// T-81: Task due-date policy
// Validates that task due-dates are computed according to priority rules and
// that overdue detection works correctly

type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

const DUE_DATE_OFFSET_HOURS: Record<TaskPriority, number> = {
  urgent: 1,
  high: 4,
  normal: 24,
  low: 72,
};

function computeDueDate(createdAt: string, priority: TaskPriority): Date {
  const base = new Date(createdAt);
  const offsetMs = DUE_DATE_OFFSET_HOURS[priority] * 60 * 60 * 1000;
  return new Date(base.getTime() + offsetMs);
}

function isOverdue(dueDate: string | Date, nowISO?: string): boolean {
  const due = new Date(dueDate).getTime();
  const now = nowISO ? new Date(nowISO).getTime() : Date.now();
  return now > due;
}

function taskDueDateLabel(dueDate: string | Date, nowISO?: string): string {
  const due = new Date(dueDate).getTime();
  const now = nowISO ? new Date(nowISO).getTime() : Date.now();
  const diffMs = due - now;
  if (diffMs < 0) return 'Overdue';
  const diffH = Math.floor(diffMs / (60 * 60 * 1000));
  if (diffH < 1) return 'Due soon';
  if (diffH < 24) return `Due in ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `Due in ${diffD}d`;
}

const BASE_TIME = '2024-06-01T08:00:00.000Z';

describe('Task Due-Date Policy (T-81)', () => {
  it('sets due date 1h ahead for urgent tasks', () => {
    const due = computeDueDate(BASE_TIME, 'urgent');
    const diff = due.getTime() - new Date(BASE_TIME).getTime();
    expect(diff).toBe(1 * 60 * 60 * 1000);
  });

  it('sets due date 4h ahead for high tasks', () => {
    const due = computeDueDate(BASE_TIME, 'high');
    const diff = due.getTime() - new Date(BASE_TIME).getTime();
    expect(diff).toBe(4 * 60 * 60 * 1000);
  });

  it('sets due date 24h ahead for normal tasks', () => {
    const due = computeDueDate(BASE_TIME, 'normal');
    const diff = due.getTime() - new Date(BASE_TIME).getTime();
    expect(diff).toBe(24 * 60 * 60 * 1000);
  });

  it('sets due date 72h ahead for low priority tasks', () => {
    const due = computeDueDate(BASE_TIME, 'low');
    const diff = due.getTime() - new Date(BASE_TIME).getTime();
    expect(diff).toBe(72 * 60 * 60 * 1000);
  });

  it('detects overdue correctly', () => {
    const due = '2024-06-01T07:00:00.000Z'; // 1 hour before now
    expect(isOverdue(due, BASE_TIME)).toBe(true);
  });

  it('detects non-overdue correctly', () => {
    const due = '2024-06-01T10:00:00.000Z'; // 2 hours after now
    expect(isOverdue(due, BASE_TIME)).toBe(false);
  });

  it('labels overdue task correctly', () => {
    const due = '2024-06-01T07:00:00.000Z';
    expect(taskDueDateLabel(due, BASE_TIME)).toBe('Overdue');
  });

  it('labels task due within the hour as "Due soon"', () => {
    const due = '2024-06-01T08:30:00.000Z';
    expect(taskDueDateLabel(due, BASE_TIME)).toBe('Due soon');
  });

  it('labels task due in hours correctly', () => {
    const due = '2024-06-01T14:00:00.000Z'; // 6h later
    expect(taskDueDateLabel(due, BASE_TIME)).toBe('Due in 6h');
  });

  it('labels task due in days correctly', () => {
    const due = '2024-06-03T08:00:00.000Z'; // 2d later
    expect(taskDueDateLabel(due, BASE_TIME)).toBe('Due in 2d');
  });
});
