import type { UserRole } from '@/types/auth';

export type QueueStatus = 'waiting' | 'called' | 'in_prep' | 'in_service' | 'completed';

const ACTIVE_QUEUE_ROLES: UserRole[] = ['nurse', 'doctor', 'receptionist', 'admin'];

const QUEUE_TRANSITIONS: Record<QueueStatus, QueueStatus[]> = {
  waiting: ['called', 'in_prep'],
  called: ['waiting', 'in_prep', 'in_service'],
  in_prep: ['called', 'in_service'],
  in_service: ['completed'],
  completed: [],
};

export function canTransitionQueueStatus(
  current: QueueStatus,
  next: QueueStatus,
  actorRole?: UserRole | null
): boolean {
  if (current === next) return true;

  const allowedNext = QUEUE_TRANSITIONS[current] || [];
  if (!allowedNext.includes(next)) return false;

  if (!actorRole) return false;
  return ACTIVE_QUEUE_ROLES.includes(actorRole);
}
