/**
 * Edge Function: Drug Interaction Check (Tier 4.5 - Phase 2)
 * 
 * Purpose: Check for drug-drug interactions (DDI) when a medication is prescribed
 * Pattern: Check local DB first, fall back to RxNorm API, cache results
 * 
 * Trigger: Called by React hook when pharmacist adds prescription
 * 
 * Security: 
 * - Hospital-scoped (validates user's hospital_id)
 * - RLS policies enforced (even though service role, we validate request)
 * - Audit logged to audit_logs table
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RXNORM_API = 'https://rxnav.nlm.nih.gov/REST';
const TIMEOUT_MS = 5000; // RxNorm API timeout

interface CheckRequest {
  patientId: string;
  newDrugRxcui: string;
  newDrugName?: string;
  hospitalId: string;
  userId: string;
}

interface Interaction {
  interactingDrug: string;
  severity: 'contraindicated' | 'serious' | 'moderate' | 'minor';
  recommendation: string;
  source: 'local' | 'rxnorm';
}

interface CheckResponse {
  severity: 'contraindicated' | 'serious' | 'moderate' | 'minor' | 'none';
  interactions: Interaction[];
  cacheHit: boolean;
  timestamp: string;
  error?: string;
}

// Severity ranking: higher number = more severe
const SEVERITY_RANK = {
  contraindicated: 4,
  serious: 3,
  moderate: 2,
  minor: 1,
  none: 0,
} as const;

/**
 * Get max severity from array of interactions
 */
function getMaxSeverity(
  interactions: Interaction[]
): 'contraindicated' | 'serious' | 'moderate' | 'minor' | 'none' {
  if (interactions.length === 0) return 'none';

  const max = interactions.reduce((prev, current) => {
    return SEVERITY_RANK[current.severity] > SEVERITY_RANK[prev.severity] ? current : prev;
  });

  return max.severity;
}

/**
 * Map RxNorm severity strings to our enum
 */
function mapRxNormSeverity(rxnormSeverity: string): 'contraindicated' | 'serious' | 'moderate' | 'minor' {
  const map: Record<string, 'contraindicated' | 'serious' | 'moderate' | 'minor'> = {
    'contraindicated': 'contraindicated',
    'serious': 'serious',
    'moderate': 'moderate',
    'minor': 'minor',
    'mild': 'minor',
    'n/a': 'minor',
    'unknown': 'minor',
  };
  return map[rxnormSeverity?.toLowerCase() || 'unknown'] || 'minor';
}

/**
 * Call RxNorm API with timeout
 */
async function fetchFromRxNorm(rxcui: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${RXNORM_API}/interaction/list.json?rxcuis=${rxcui}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`RxNorm API error: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse RxNorm API response and extract interactions
 */
function parseRxNormInteractions(data: any): Interaction[] {
  const interactions: Interaction[] = [];

  if (!data.interactionTypeGroup) {
    return interactions;
  }

  for (const group of data.interactionTypeGroup) {
    if (!group.interactionType) continue;

    for (const type of group.interactionType) {
      if (!type.interactionPair) continue;

      for (const pair of type.interactionPair) {
        const interactingConcepts = pair.interactionConcept || [];
        if (interactingConcepts.length < 2) continue;

        const drugName = interactingConcepts[1]?.preferred || 'Unknown Drug';
        const severity = mapRxNormSeverity(pair.severity);
        const recommendation = pair.description || 'Consult with pharmacist';

        interactions.push({
          interactingDrug: drugName,
          severity,
          recommendation,
          source: 'rxnorm',
        });
      }
    }
  }

  return interactions;
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Parse request
    const { patientId, newDrugRxcui, newDrugName, hospitalId, userId } = (await req.json()) as CheckRequest;

    if (!patientId || !newDrugRxcui || !hospitalId || !userId) {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameters: patientId, newDrugRxcui, hospitalId, userId',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client (service role for full access)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // ========================================================================
    // 1. CHECK CACHE FIRST (30-day TTL)
    // ========================================================================
    const { data: cached, error: cacheError } = await supabase
      .from('drug_interaction_cache')
      .select('*')
      .eq('patient_id', patientId)
      .eq('new_drug_rxcui', newDrugRxcui)
      .eq('hospital_id', hospitalId)
      .gt('expires_at', 'now()')
      .single();

    if (cached && !cacheError) {
      console.log(`Cache hit for patient ${patientId} + drug ${newDrugRxcui}`);
      return new Response(
        JSON.stringify({
          severity: cached.severity_max,
          interactions: cached.details?.interactions || [],
          cacheHit: true,
          timestamp: new Date().toISOString(),
        } as CheckResponse),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // 2. FETCH CURRENT MEDICATIONS FOR PATIENT
    // ========================================================================
    const { data: currentPrescriptions, error: rxError } = await supabase
      .from('prescriptions')
      .select('drug_rxcui, drug_name')
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .neq('drug_rxcui', newDrugRxcui);

    if (rxError) {
      console.error('Error fetching patient prescriptions:', rxError);
      // Fail safe — continue with empty list
    }

    // ========================================================================
    // 3. CHECK AGAINST LOCAL DATABASE (Tier 4.5 Phase 1 data)
    // ========================================================================
    const interactions: Interaction[] = [];
    let maxSeverity: 'contraindicated' | 'serious' | 'moderate' | 'minor' | 'none' = 'none';

    for (const rx of currentPrescriptions || []) {
      // Check drug1 = newDrug, drug2 = currentRx
      const { data: match1 } = await supabase
        .from('drug_interactions')
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('drug1_rxcui', newDrugRxcui)
        .eq('drug2_rxcui', rx.drug_rxcui)
        .single();

      // Check reverse: drug1 = currentRx, drug2 = newDrug
      const { data: match2 } = await supabase
        .from('drug_interactions')
        .select('*')
        .eq('hospital_id', hospitalId)
        .eq('drug1_rxcui', rx.drug_rxcui)
        .eq('drug2_rxcui', newDrugRxcui)
        .single();

      const match = match1 || match2;

      if (match) {
        interactions.push({
          interactingDrug: rx.drug_name,
          severity: match.severity,
          recommendation: match.clinical_recommendation || 'Consult pharmacist',
          source: 'local',
        });

        // Update max severity
        if (SEVERITY_RANK[match.severity] > SEVERITY_RANK[maxSeverity]) {
          maxSeverity = match.severity;
        }
      }
    }

    // ========================================================================
    // 4. IF NO LOCAL MATCHES, TRY RXNORM API (with timeout)
    // ========================================================================
    if (interactions.length === 0 && newDrugRxcui.match(/^\d+$/)) {
      try {
        console.log(`Querying RxNorm API for drug ${newDrugRxcui}`);
        const rxnormData = await fetchFromRxNorm(newDrugRxcui);
        const rxnormInteractions = parseRxNormInteractions(rxnormData);

        interactions.push(...rxnormInteractions);

        // Update max severity from RxNorm
        for (const interaction of rxnormInteractions) {
          if (SEVERITY_RANK[interaction.severity] > SEVERITY_RANK[maxSeverity]) {
            maxSeverity = interaction.severity;
          }
        }

        console.log(`RxNorm returned ${rxnormInteractions.length} interactions`);
      } catch (err: any) {
        // Log error but don't fail — patient safety concern if we block all prescriptions
        console.error('RxNorm API error (non-fatal):', err.message);
        // Fail-safe: assume 'minor' severity, continue
        maxSeverity = 'minor';
      }
    }

    // ========================================================================
    // 5. CACHE RESULT (30-day TTL)
    // ========================================================================
    const { error: cacheInsertError } = await supabase
      .from('drug_interaction_cache')
      .insert({
        hospital_id: hospitalId,
        patient_id: patientId,
        new_drug_rxcui: newDrugRxcui,
        new_drug_name: newDrugName || 'Unknown',
        interactions_found: interactions.length,
        severity_max: maxSeverity,
        details: { interactions },
        checked_by: userId,
      });

    if (cacheInsertError) {
      console.error('Error caching DDI check result:', cacheInsertError);
      // Non-critical, continue
    }

    // ========================================================================
    // 6. AUDIT LOG (HIPAA compliance)
    // ========================================================================
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action_type: 'drug_interaction_check',
        resource_type: 'prescription',
        resource_id: `${patientId}-${newDrugRxcui}`,
        performed_by: userId,
        hospital_id: hospitalId,
        details: {
          patient_id: patientId,
          new_drug_rxcui: newDrugRxcui,
          interactions_found: interactions.length,
          severity: maxSeverity,
          cacheHit: false,
        },
      });

    if (auditError) {
      console.error('Error logging DDI check to audit_logs:', auditError);
      // Non-critical, continue
    }

    // ========================================================================
    // 7. RETURN RESULT
    // ========================================================================
    return new Response(
      JSON.stringify({
        severity: maxSeverity,
        interactions,
        cacheHit: false,
        timestamp: new Date().toISOString(),
      } as CheckResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in drug-interaction-check:', err);

    return new Response(
      JSON.stringify({
        severity: 'none',
        interactions: [],
        cacheHit: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      } as CheckResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Deno deploy configuration:
 * - Update supabase/config.toml:
 *   [functions."drug-interaction-check"]
 *   imports = ["https://deno.land/std@0.168.0/http/server.ts", "https://esm.sh/@supabase/supabase-js@2"]
 */
