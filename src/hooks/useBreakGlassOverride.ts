/**
 * useBreakGlassOverride Hook
 * Phase 4: Emergency override patterns with mandatory reason capture
 *
 * Usage example:
 *   const { initiateOverride, isApproving } = useBreakGlassOverride();
 *   await initiateOverride({
 *     reason: "Patient experiencing tachycardia - emergency hypertension treatment required",
 *     emergency_level: "critical",
 *     override_type: "clinical_judgment_override",
 *     related_patient_id: patientId
 *   });
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  validateBreakGlassOverride,
  sanitizeBreakGlassReason,
  hashBreakGlassReason,
  canApproveBreakGlass,
  calculateBreakGlassExpiration,
  shouldEscalateToAdmin,
  type BreakGlassOverride,
} from '@/lib/workflow/breakglassOverride';

interface InitiateOverrideParams extends Partial<BreakGlassOverride> {
  related_patient_id: string;
  override_type: string;
  emergency_level: string;
  reason: string;
}

interface BreakGlassOverrideResponse {
  override_id: string;
  status: 'approved' | 'escalated' | 'rejected';
  expires_at: string;
  escalation_reason?: string;
}

export function useBreakGlassOverride() {
  const { hospital, profile, primaryRole } = useAuth();
  const queryClient = useQueryClient();

  /**
   * Initiate a break-glass override request
   */
  const initiateOverride = useMutation({
    mutationFn: async (params: InitiateOverrideParams): Promise<BreakGlassOverrideResponse> => {
      if (!hospital?.id) {
        throw new Error('Hospital context required for break-glass override');
      }

      if (!profile?.user_id) {
        throw new Error('User authentication required for break-glass override');
      }

      // Step 1: Validate override request
      const override = validateBreakGlassOverride({
        reason: params.reason,
        emergency_level: params.emergency_level,
        approved_by_role: primaryRole === 'admin' ? 'admin' : primaryRole as any,
        related_patient_id: params.related_patient_id,
        override_type: params.override_type,
      });

      // Step 2: Check authorization
      const authCheck = canApproveBreakGlass(primaryRole!, override.override_type);
      if (!authCheck.allowed) {
        throw new Error(authCheck.reason || 'User role not authorized for this override type');
      }

      // Step 3: Hash reason for integrity verification
      const reasonHash = await hashBreakGlassReason(override.reason);
      const sanitizedReason = sanitizeBreakGlassReason(override.reason);

      // Step 4: Calculate expiration (1 hour from now)
      const expiresAt = calculateBreakGlassExpiration();

      // Step 5: Create audit event in database
      const { data, error } = await supabase
        .from('break_glass_overrides')
        .insert([
          {
            hospital_id: hospital.id,
            triggered_by_user_id: profile.user_id,
            approved_by_role: primaryRole,
            patient_id: override.related_patient_id,
            override_type: override.override_type,
            emergency_level: override.emergency_level,
            reason_sanitized: sanitizedReason,
            reason_hash: reasonHash,
            status: 'active',
            expires_at: expiresAt,
            created_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Step 6: Check if escalation needed (> 1 minute)
      const shouldEscalate = shouldEscalateToAdmin(data?.created_at);
      if (shouldEscalate) {
        // Auto-escalate to admin after 1 minute
        await supabase
          .from('break_glass_overrides')
          .update({
            escalated_to_admin: true,
            escalation_timestamp: new Date().toISOString(),
          })
          .eq('id', data.id);

        // Notify admin
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('role', 'admin')
          .eq('hospital_id', hospital.id);

        if (adminProfiles && adminProfiles.length > 0) {
          await Promise.all(
            adminProfiles.map(admin =>
              supabase.from('notifications').insert({
                hospital_id: hospital.id,
                recipient_id: admin.user_id,
                sender_id: profile.user_id,
                type: 'emergency_escalation',
                title: 'Break-Glass Override Escalation',
                message: `${primaryRole} initiated emergency override (${override.override_type}) - requires admin review`,
                priority: 'urgent',
                category: 'clinical',
                metadata: {
                  override_id: data.id,
                  emergency_level: override.emergency_level,
                  patient_id: override.related_patient_id,
                }
              })
            )
          );
        }

        toast.warning(
          'Override escalated to admin - please contact administrator for critical emergencies'
        );

        return {
          override_id: data.id,
          status: 'escalated',
          expires_at: expiresAt,
          escalation_reason: 'Duration > 1 minute'
        };
      }

      // Step 7: Log successful override to audit trail
      await supabase.from('audit_logs').insert({
        hospital_id: hospital.id,
        actor_id: profile.user_id,
        action_type: 'break_glass_override_initiated',
        resource_type: 'patient',
        resource_id: override.related_patient_id,
        change_reason: sanitizedReason,
        before_state: { status: 'normal' },
        after_state: { status: 'emergency_override_active' },
      });

      toast.success(
        `Emergency override approved (expires in 1 hour)`,
        { duration: 5000 }
      );

      return {
        override_id: data.id,
        status: 'approved',
        expires_at: expiresAt,
      };
    },
    onSuccess: () => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['break-glass-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (error: Error) => {
      toast.error(`Override failed: ${error.message}`, { duration: 5000 });
    },
  });

  /**
   * Revoke an active break-glass override
   */
  const revokeOverride = useMutation({
    mutationFn: async (overrideId: string): Promise<void> => {
      if (!hospital?.id) {
        throw new Error('Hospital context required');
      }

      if (!profile?.user_id) {
        throw new Error('User authentication required');
      }

      // Only admin or the original requestor can revoke
      const { data: override } = await supabase
        .from('break_glass_overrides')
        .select('*')
        .eq('id', overrideId)
        .single();

      if (!override) throw new Error('Override not found');

      if (
        primaryRole !== 'admin' &&
        override.triggered_by_user_id !== profile.user_id
      ) {
        throw new Error('Only admins or original requestor can revoke override');
      }

      const { error } = await supabase
        .from('break_glass_overrides')
        .update({
          status: 'revoked',
          escalated_to_admin: false,
        })
        .eq('id', overrideId);

      if (error) throw error;

      toast.success('Override revoked');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['break-glass-overrides'] });
    },
    onError: (error: Error) => {
      toast.error(`Revocation failed: ${error.message}`);
    },
  });

  /**
   * Check if patient has active break-glass override
   */
  const checkActiveOverride = async (patientId: string) => {
    if (!hospital?.id) return null;

    const { data } = await supabase
      .from('break_glass_overrides')
      .select('*')
      .eq('hospital_id', hospital.id)
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data;
  };

  return {
    initiateOverride: initiateOverride.mutate,
    initiateOverrideAsync: initiateOverride.mutateAsync,
    isApproving: initiateOverride.isPending,
    revokeOverride: revokeOverride.mutate,
    revokeOverrideAsync: revokeOverride.mutateAsync,
    isRevoking: revokeOverride.isPending,
    checkActiveOverride,
    error: initiateOverride.error || revokeOverride.error,
  };
}
