export type CanonicalLabPriority = 'routine' | 'urgent' | 'stat';

export function mapToCanonicalLabPriority(priority: string | null | undefined): CanonicalLabPriority {
  const normalized = String(priority || '').toLowerCase();
  if (normalized === 'urgent' || normalized === 'high' || normalized === 'emergency') return 'urgent';
  if (normalized === 'stat' || normalized === 'critical') return 'stat';
  return 'routine';
}

export function mapToWorkflowPriority(priority: string | null | undefined): 'normal' | 'urgent' {
  const canonical = mapToCanonicalLabPriority(priority);
  return canonical === 'routine' ? 'normal' : 'urgent';
}

