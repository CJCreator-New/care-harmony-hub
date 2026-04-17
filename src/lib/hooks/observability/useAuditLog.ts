// @ts-nocheck
/**
 * Audit Trail Hook
 * 
 * Centralized audit logging for all clinical and administrative actions.
 * Implements HIPAA Domain 7: Audit Controls
 * 
 * - Logs all patient data access
 * - Tracks clinical decision points (prescriptions, lab results, billing)
 * - Records user actions with correlation IDs
 * - Maintains immutable audit chain
 * 
 * Usage:
 * ```tsx
 * const { logActivity } = useAuditLog();
 * 
 * logActivity({
 *   eventType: 'PATIENT_VIEWED',
 *   resourceType: 'patient',
 *   resourceId: patientId,
 *   details: { reason: 'Treatment planning' },
 * });
 * ```
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeForLog } from '@/utils/sanitize';
import type { HospitalContext } from '@/types/hospital';

/**
 * Audit event types - comprehensive taxonomy of clinical and admin actions
 */
export enum AuditEventType {
  // Patient access
  PATIENT_VIEWED = 'PATIENT_VIEWED',
  PATIENT_CREATED = 'PATIENT_CREATED',
  PATIENT_UPDATED = 'PATIENT_UPDATED',
  PATIENT_DELETED = 'PATIENT_DELETED',
  PATIENT_DISCHARGED = 'PATIENT_DISCHARGED',

  // Clinical workflows
  CONSULTATION_INITIATED = 'CONSULTATION_INITIATED',
  CONSULTATION_COMPLETED = 'CONSULTATION_COMPLETED',
  DIAGNOSIS_RECORDED = 'DIAGNOSIS_RECORDED',
  VITAL_SIGNS_RECORDED = 'VITAL_SIGNS_RECORDED',

  // Prescription management
  PRESCRIPTION_CREATED = 'PRESCRIPTION_CREATED',
  PRESCRIPTION_APPROVED = 'PRESCRIPTION_APPROVED',
  PRESCRIPTION_REJECTED = 'PRESCRIPTION_REJECTED',
  PRESCRIPTION_DISPENSED = 'PRESCRIPTION_DISPENSED',

  // Lab operations
  LAB_ORDER_PLACED = 'LAB_ORDER_PLACED',
  LAB_RESULT_RECEIVED = 'LAB_RESULT_RECEIVED',
  LAB_RESULT_REVIEWED = 'LAB_RESULT_REVIEWED',
  CRITICAL_VALUE_DETECTED = 'CRITICAL_VALUE_DETECTED',

  // Billing operations
  BILL_GENERATED = 'BILL_GENERATED',
  BILL_PAID = 'BILL_PAID',
  BILL_ADJUSTED = 'BILL_ADJUSTED',
  INSURANCE_CLAIM_FILED = 'INSURANCE_CLAIM_FILED',

  // Administrative actions
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  ROLE_CHANGED = 'ROLE_CHANGED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',

  // Error & security events
  ACCESS_DENIED = 'ACCESS_DENIED',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
  DATA_EXPORT_REQUESTED = 'DATA_EXPORT_REQUESTED',
}

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  eventType: AuditEventType | string;
  resourceType: string; // 'patient', 'consultation', 'prescription', etc.
  resourceId?: string;
  userId?: string;
  hospitalId?: string;
  details?: Record<string, unknown>;
  severity?: 'info' | 'warning' | 'critical';
  timestamp?: string;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * useAuditLog Hook
 */
export function useAuditLog() {
  const { user, hospital } = useAuth();
  const correlationIdRef = useRef<string>(generateCorrelationId());

  /**
   * Log an audit event
   */
  const logActivity = useCallback(
    async (entry: Omit<AuditLogEntry, 'userId' | 'hospitalId' | 'timestamp' | 'correlationId'>) => {
      if (!user?.id) return;

      const auditEntry: AuditLogEntry = {
        ...entry,
        userId: user.id,
        hospitalId: hospital?.id,
        timestamp: new Date().toISOString(),
        correlationId: correlationIdRef.current,
        ipAddress: undefined, // Set by backend
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        severity: entry.severity || determineSeverity(entry.eventType),
      };

      try {
        // Send to backend audit logging endpoint
        const response = await fetch('/api/audit-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-Id': correlationIdRef.current,
          },
          body: JSON.stringify(sanitizeAuditEntry(auditEntry)),
        });

        if (!response.ok) {
          console.error('Failed to log audit event:', response.statusText);
        }
      } catch (error) {
        // Fail silently - don't interrupt user workflows if audit logging fails
        console.error('Audit logging error:', sanitizeForLog(String(error)));
      }
    },
    [user?.id, hospital?.id]
  );

  /**
   * Get correlation ID for tracing related events
   */
  const getCorrelationId = useCallback(() => {
    return correlationIdRef.current;
  }, []);

  /**
   * Set new correlation ID (for multi-step workflows)
   */
  const setCorrelationId = useCallback((id: string) => {
    correlationIdRef.current = id;
  }, []);

  /**
   * Log user login
   */
  const logLogin = useCallback(async () => {
    if (user?.id) {
      await logActivity({
        eventType: AuditEventType.USER_LOGIN,
        resourceType: 'user',
        resourceId: user.id,
        severity: 'info',
      });
    }
  }, [user?.id, logActivity]);

  /**
   * Log patient access (for compliance auditing)
   */
  const logPatientAccess = useCallback(
    async (patientId: string, reason?: string) => {
      await logActivity({
        eventType: AuditEventType.PATIENT_VIEWED,
        resourceType: 'patient',
        resourceId: patientId,
        details: reason ? { reason: sanitizeForLog(reason) } : undefined,
        severity: 'info',
      });
    },
    [logActivity]
  );

  /**
   * Log clinical action (prescription, lab order, etc.)
   */
  const logClinicalAction = useCallback(
    async (eventType: AuditEventType, resourceType: string, resourceId: string, details?: Record<string, unknown>) => {
      await logActivity({
        eventType,
        resourceType,
        resourceId,
        details,
        severity: 'warning', // Clinical actions are elevated severity
      });
    },
    [logActivity]
  );

  /**
   * Log security event (unauthorized access attempt, etc.)
   */
  const logSecurityEvent = useCallback(
    async (eventType: AuditEventType, details?: Record<string, unknown>) => {
      await logActivity({
        eventType,
        resourceType: 'security',
        details,
        severity: 'critical',
      });
    },
    [logActivity]
  );

  return {
    logActivity,
    logLogin,
    logPatientAccess,
    logClinicalAction,
    logSecurityEvent,
    getCorrelationId,
    setCorrelationId,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate unique correlation ID for tracing workflows
 */
function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Determine severity level based on event type
 */
function determineSeverity(eventType: string): 'info' | 'warning' | 'critical' {
  if (
    eventType.includes('ACCESS_DENIED') ||
    eventType.includes('UNAUTHORIZED') ||
    eventType.includes('DELETED')
  ) {
    return 'critical';
  }

  if (
    eventType.includes('CREATED') ||
    eventType.includes('UPDATED') ||
    eventType.includes('APPROVED') ||
    eventType.includes('DISPENSED')
  ) {
    return 'warning';
  }

  return 'info';
}

/**
 * Sanitize audit entry to prevent PHI leaks
 */
function sanitizeAuditEntry(entry: AuditLogEntry): AuditLogEntry {
  return {
    ...entry,
    details: entry.details ? sanitizeDetails(entry.details) : undefined,
  };
}

/**
 * Sanitize details object to redact sensitive fields
 */
function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const highRiskFields = [
    'diagnosis',
    'medication',
    'prescription',
    'clinical_notes',
    'patient_name',
    'ssn',
    'medical_record_number',
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (highRiskFields.some((field) => key.toLowerCase().includes(field))) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeForLog(value);
      } else {
        sanitized[key] = '[REDACTED]';
      }
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeForLog(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
