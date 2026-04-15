import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useLocation } from 'react-router-dom';
import { UserRole } from '@/types/auth';

interface PermissionDenialRecord {
  path: string;
  attemptedBy: string | null;
  userRole: UserRole | null;
  allowedRoles: UserRole[];
  timestamp: string;
  severity: 'warning' | 'critical';
}

/**
 * Hook to audit and log unauthorized access attempts
 * Helps identify and troubleshoot permission enforcement issues
 */
export const usePermissionAudit = () => {
  const { user, primaryRole } = useAuth();
  const { logActivity } = useActivityLog();
  const location = useLocation();

  const logPermissionDenial = useCallback(
    (
      denialRecord: Omit<PermissionDenialRecord, 'timestamp'>
    ): Promise<void> => {
      const auditRecord: PermissionDenialRecord = {
        ...denialRecord,
        timestamp: new Date().toISOString(),
      };

      // Log to console in development
      if (import.meta.env.DEV) {
        console.error('[Permission Audit]', auditRecord, {
          userEmail: user?.email,
          userId: user?.id,
        });
      }

      // Log to activity audit trail
      return logActivity({
        actionType: 'settings_update',
        entityType: 'route_access',
        entityId: location.pathname,
        details: {
          event: 'permission_denied',
          attempted_path: denialRecord.path,
          user_role: denialRecord.userRole,
          allowed_roles: denialRecord.allowedRoles,
          severity: denialRecord.severity,
        },
      }).catch((err) => {
        console.error('Failed to log permission denial:', err);
      });
    },
    [user, logActivity, location],
  );

  return { logPermissionDenial };
};
