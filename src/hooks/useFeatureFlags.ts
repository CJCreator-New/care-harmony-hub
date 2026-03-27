/**
 * useFeatureFlags — per-hospital runtime feature flag hook (T-87).
 *
 * Controls runtime rollout flags across workflow upgrades and guarded route tiers:
 *   doctor_flow_v2 | lab_flow_v2 | nurse_flow_v2 |
 *   pharmacy_flow_v2 | reception_flow_v2 | patient_portal_v2 |
 *   ai_demo | ai_clinical_tools | ai_analytics | testing_dashboard
 *
 * Usage:
 *   const { flags, isEnabled } = useFeatureFlags();
 *   if (isEnabled('doctor_flow_v2')) { ... }
 *
 * Absence of a row in feature_flags => flag is FALSE (legacy path is safe default).
 * Enable per-hospital via the Admin settings panel (writes to the feature_flags table).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ─── Known flag names (extend as new v2 paths are introduced) ────────────────
export type FeatureFlagName =
  | 'doctor_flow_v2'
  | 'lab_flow_v2'
  | 'nurse_flow_v2'
  | 'pharmacy_flow_v2'
  | 'reception_flow_v2'
  | 'patient_portal_v2'
  | 'ai_demo'
  | 'ai_clinical_tools'
  | 'ai_analytics'
  | 'testing_dashboard';

export type FeatureFlags = Record<FeatureFlagName, boolean>;

// Safe defaults — all flags off until explicitly enabled
const DEFAULT_FLAGS: FeatureFlags = {
  doctor_flow_v2: false,
  lab_flow_v2: false,
  nurse_flow_v2: false,
  pharmacy_flow_v2: false,
  reception_flow_v2: false,
  patient_portal_v2: false,
  ai_demo: false,
  ai_clinical_tools: false,
  ai_analytics: false,
  testing_dashboard: false,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFeatureFlags() {
  const { hospital } = useAuth();

  const query = useQuery({
    queryKey: ['feature-flags', hospital?.id],
    queryFn: async (): Promise<FeatureFlags> => {
      if (!hospital?.id) return { ...DEFAULT_FLAGS };

      const { data, error } = await (supabase as any)
        .from('feature_flags')
        .select('flag_name, enabled')
        .eq('hospital_id', hospital.id);

      if (error) {
        // Table may not exist yet in dev — fall back to defaults silently
        console.warn('[useFeatureFlags] Could not load feature flags:', error.message);
        return { ...DEFAULT_FLAGS };
      }

      const flags: FeatureFlags = { ...DEFAULT_FLAGS };
      for (const row of (data ?? []) as { flag_name: string; enabled: boolean }[]) {
        if (row.flag_name in flags) {
          (flags as Record<string, boolean>)[row.flag_name] = row.enabled;
        }
      }
      return flags;
    },
    staleTime: 5 * 60 * 1000, // Re-fetch every 5 minutes
    enabled: !!hospital?.id,
  });

  /**
   * Type-safe flag checker.
   * Returns `false` while loading or if the query fails (fail-safe = legacy path).
   */
  const isEnabled = (flagName: FeatureFlagName): boolean => {
    return query.data?.[flagName] ?? false;
  };

  return {
    /** Record of all known flags with their current enabled state. */
    flags: query.data ?? DEFAULT_FLAGS,
    /** Type-safe helper: `isEnabled('doctor_flow_v2')` */
    isEnabled,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
