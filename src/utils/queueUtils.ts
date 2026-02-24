/**
 * Queue utility helpers.
 * Uses `check_in_time` when available (populated at reception desk) and falls
 * back to `created_at` so that wait time is always meaningful.
 */

export function getQueueStartTime(entry: {
  check_in_time?: string | null;
  created_at: string;
}): string {
  return entry.check_in_time ?? entry.created_at;
}

export function getWaitMinutes(
  entry: { check_in_time?: string | null; created_at: string },
  nowISO?: string
): number {
  const start = new Date(getQueueStartTime(entry)).getTime();
  const now = nowISO ? new Date(nowISO).getTime() : Date.now();
  return Math.max(0, Math.floor((now - start) / 60_000));
}

export function formatWaitTime(minutes: number): string {
  if (minutes < 1) return 'Just arrived';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
