/**
 * Returns a time-of-day greeting string.
 * Extracted from individual dashboard components to provide a single source of truth.
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
