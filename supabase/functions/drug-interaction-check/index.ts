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
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { getAuthorizedActor } from '../_shared/authorize.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const RXNORM_API = 'https://rxnav.nlm.nih.gov/REST';
const TIMEOUT_MS = 5000; // RxNorm API timeout

// Clinical roles permitted to run interaction checks.
const ALLOWED_ROLES = ['admin', 'doctor', 'pharmacist', 'nurse'];

// patientId/newDrug come from the request; hospitalId and userId are derived from the
// authenticated JWT (never trusted from the body) to prevent cross-hospital access.
const checkRequestSchema = z.object({
  patientId: z.string().uuid().optional(),
  newDrugRxcui: z.string().min(1).max(128).optional(),
  newDrugName: z.string().max(255).optional(),
  drugCodes: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
});

interface Interaction {
  interactingDrug: string;
  severity: 'contraindicated' | 'serious' | 'moderate' | 'minor';
  recommendation: string;
  source: 'local' | 'rxnorm';
}

interface CheckResponse {
  severity: 'contraindicated' | 'serious' | 'moderate' | 'minor' | 'none' | 'unknown';
  interactions: Interaction[];
  cacheHit: boolean;
  timestamp: string;
  error?: string;
  requiresManualReview?: boolean;
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
  const corsHeaders = getCorsHeaders(req);
  const json = (status: number, payload: Record<string, unknown>) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── AuthZ: derive identity & hospital from the JWT, not the request body ──
    const { actor, response: authErr } = await getAuthorizedActor(req, ALLOWED_ROLES);
    if (authErr) {
      return new Response(await authErr.text(), {
        status: authErr.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const hospitalId = actor!.hospitalId;
    const userId = actor!.userId;
    if (!hospitalId) {
      return json(400, { error: 'Authenticated user is not associated with a hospital' });
    }

    // Validate the client-supplied portion of the request.
    const parsed = checkRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json(400, {
        error: 'Validation failed',
        details: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      });
    }
    const { patientId, newDrugRxcui: inputRxcui, newDrugName: inputName, drugCodes, medications } = parsed.data;

    const allDrugNames: string[] = [];
    if (inputName) allDrugNames.push(inputName);
    if (medications) allDrugNames.push(...medications);
    if (drugCodes) {
      for (const code of drugCodes) {
        if (!allDrugNames.includes(code)) allDrugNames.push(code);
      }
    }

    const newDrugRxcui = inputRxcui || (drugCodes && drugCodes[0]) || (allDrugNames[0] ?? 'UNKNOWN');
    const newDrugName = inputName || allDrugNames[0] || newDrugRxcui;

    // Initialize Supabase client (service role for full access)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // ========================================================================
    // 1. CHECK CACHE FIRST (30-day TTL)
    // ========================================================================
    if (patientId) {
      const { data: cached, error: cacheError } = await supabase
        .from('drug_interaction_cache')
        .select('*')
        .eq('patient_id', patientId)
        .eq('new_drug_rxcui', newDrugRxcui)
        .eq('hospital_id', hospitalId)
        .gt('expires_at', 'now()')
        .maybeSingle();

      if (cached && !cacheError) {
        console.log(`Cache hit for patient ${patientId} + drug ${newDrugRxcui}`);
        return json(200, {
          severity: cached.severity_max,
          interactions: cached.details?.interactions || [],
          cacheHit: true,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // ========================================================================
    // 2. FETCH CURRENT MEDICATIONS FOR PATIENT
    // ========================================================================
    let currentPrescriptions: Array<{ drug_rxcui: string; drug_name: string }> = [];
    if (patientId) {
      const { data: rxData, error: rxError } = await supabase
        .from('prescriptions')
        .select('drug_rxcui, drug_name')
        .eq('patient_id', patientId)
        .eq('status', 'active')
        .neq('drug_rxcui', newDrugRxcui);

      if (rxError) {
        console.error('Error fetching patient prescriptions:', rxError);
      } else if (rxData) {
        currentPrescriptions = rxData;
      }
    }

    // If multiple drugCodes were provided in request, add them to evaluation
    if (drugCodes && drugCodes.length > 1) {
      for (let i = 1; i < drugCodes.length; i++) {
        currentPrescriptions.push({ drug_rxcui: drugCodes[i], drug_name: drugCodes[i] });
      }
    }

    // ========================================================================
    // 3. CHECK AGAINST LOCAL DATABASE (Tier 4.5 Phase 1 data) & CLINICAL SAFETY RULES
    // ========================================================================
    const interactions: Interaction[] = [];
    let maxSeverity: 'contraindicated' | 'serious' | 'moderate' | 'minor' | 'none' | 'unknown' = 'none';
    let hasApiError = false;

    // Hard-stop clinical contraindications (e.g. Sildenafil + Nitrates, SSRI + MAOI)
    const CRITICAL_PAIRS: Array<{
      pattern1: RegExp;
      pattern2: RegExp;
      severity: 'contraindicated' | 'serious';
      recommendation: string;
    }> = [
      {
        pattern1: /sildenafil|tadalafil|vardenafil/i,
        pattern2: /nitroglycerin|isosorbide|nitrate/i,
        severity: 'contraindicated',
        recommendation: 'Severe refractory hypotension risk. Absolute contraindication.',
      },
      {
        pattern1: /fluoxetine|sertraline|paroxetine|citalopram|escitalopram|ssri/i,
        pattern2: /phenelzine|tranylcypromine|selegiline|linezolid|isocarboxazid|maoi/i,
        severity: 'contraindicated',
        recommendation: 'High risk of fatal serotonin syndrome. Absolute contraindication.',
      },
      {
        pattern1: /warfarin/i,
        pattern2: /ibuprofen|aspirin|ketorolac|naproxen|nsaid/i,
        severity: 'serious',
        recommendation: 'Increased anticoagulant effect and major GI bleeding risk.',
      },
      {
        pattern1: /metformin/i,
        pattern2: /contrast|iodinated/i,
        severity: 'serious',
        recommendation: 'Risk of contrast-induced nephropathy and lactic acidosis.',
      },
      {
        pattern1: /methotrexate/i,
        pattern2: /ibuprofen|aspirin|naproxen|nsaid/i,
        severity: 'serious',
        recommendation: 'Reduced methotrexate clearance, severe bone marrow suppression.',
      },
      {
        pattern1: /digoxin/i,
        pattern2: /amiodarone|clarithromycin|verapamil/i,
        severity: 'serious',
        recommendation: 'Marked increase in digoxin serum levels, fatal arrhythmia risk.',
      },
    ];

    const testMeds = [
      newDrugName,
      newDrugRxcui,
      ...allDrugNames,
      ...currentPrescriptions.map((p) => p.drug_name),
      ...currentPrescriptions.map((p) => p.drug_rxcui),
    ].filter(Boolean);

    for (let i = 0; i < testMeds.length; i++) {
      for (let j = i + 1; j < testMeds.length; j++) {
        const m1 = testMeds[i];
        const m2 = testMeds[j];
        for (const rule of CRITICAL_PAIRS) {
          if (
            (rule.pattern1.test(m1) && rule.pattern2.test(m2)) ||
            (rule.pattern2.test(m1) && rule.pattern1.test(m2))
          ) {
            const already = interactions.some((x) => x.interactingDrug.toLowerCase() === m2.toLowerCase());
            if (!already) {
              interactions.push({
                interactingDrug: m2,
                severity: rule.severity,
                recommendation: rule.recommendation,
                source: 'local',
              });
              if (SEVERITY_RANK[rule.severity] > SEVERITY_RANK[maxSeverity]) {
                maxSeverity = rule.severity;
              }
            }
          }
        }
      }
    }

    const currentRxcuis = (currentPrescriptions || []).map((rx) => rx.drug_rxcui);

    if (currentRxcuis.length > 0) {
      // Two batched queries (instead of one per current prescription) covering both
      // pairing directions: new+current and current+new.
      const [{ data: forwardMatches }, { data: reverseMatches }] = await Promise.all([
        supabase
          .from('drug_interactions')
          .select('*')
          .eq('hospital_id', hospitalId)
          .eq('drug1_rxcui', newDrugRxcui)
          .in('drug2_rxcui', currentRxcuis),
        supabase
          .from('drug_interactions')
          .select('*')
          .eq('hospital_id', hospitalId)
          .eq('drug2_rxcui', newDrugRxcui)
          .in('drug1_rxcui', currentRxcuis),
      ]);

      const matchByRxcui = new Map<string, any>();
      for (const m of forwardMatches || []) matchByRxcui.set(m.drug2_rxcui, m);
      for (const m of reverseMatches || []) {
        if (!matchByRxcui.has(m.drug1_rxcui)) matchByRxcui.set(m.drug1_rxcui, m);
      }

      for (const rx of currentPrescriptions || []) {
        const match = matchByRxcui.get(rx.drug_rxcui);
        if (!match) continue;

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
        // Fail-closed: do NOT downgrade to minor or assume safe; pharmacist must manually review
        console.error('RxNorm API error (fail-closed):', err.message);
        maxSeverity = 'unknown';
        hasApiError = true;
      }
    }

    // ========================================================================
    // 5. CACHE RESULT (30-day TTL) - Only cache if check was definitive (no API error)
    // ========================================================================
    if (!hasApiError && patientId) {
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
    }

    // ========================================================================
    // 6. AUDIT LOG (HIPAA compliance)
    // ========================================================================
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action_type: 'drug_interaction_check',
        resource_type: 'prescription',
        resource_id: patientId ? `${patientId}-${newDrugRxcui}` : `${hospitalId}-${newDrugRxcui}`,
        performed_by: userId,
        hospital_id: hospitalId,
        details: {
          patient_id: patientId,
          new_drug_rxcui: newDrugRxcui,
          interactions_found: interactions.length,
          severity: maxSeverity,
          cacheHit: false,
          hasApiError,
        },
      });

    if (auditError) {
      console.error('Error logging DDI check to audit_logs:', auditError);
      // Non-critical, continue
    }

    // ========================================================================
    // 7. RETURN RESULT
    // ========================================================================
    const hasSevere = maxSeverity === 'contraindicated' || maxSeverity === 'serious';
    return json(200, {
      severity: maxSeverity,
      interactions,
      cacheHit: false,
      requiresManualReview: hasApiError || maxSeverity === 'unknown' || hasSevere,
      ...(hasApiError ? { error: 'RxNorm API unavailable — manual pharmacist verification required' } : {}),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Unexpected error in drug-interaction-check:', err);

    // Fail CLOSED: surface the failure so the caller can block/queue the prescription
    // for review rather than silently treating it as "no interaction".
    return json(500, {
      severity: 'unknown',
      interactions: [],
      cacheHit: false,
      error: 'Interaction check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Deno deploy configuration:
 * - Update supabase/config.toml:
 *   [functions."drug-interaction-check"]
 *   imports = ["https://deno.land/std@0.168.0/http/server.ts", "https://esm.sh/@supabase/supabase-js@2"]
 */
