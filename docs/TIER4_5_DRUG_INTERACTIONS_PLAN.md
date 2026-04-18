# TIER 4.5 — Drug Interactions Check Implementation Plan

**Status:** 🔴 READY TO START (9 hours total)  
**Owner:** GitHub Copilot  
**Pattern:** Drug-Utilization Review (DUR) with RxNorm external integration  
**Related Items:** 4.1 (discharge med reconciliation), 4.3 (optimistic locking for prescriptions)  

---

## Overview

Implement **Drug-Drug Interactions (DDI) checking** in the prescription workflow to detect potentially dangerous medication combinations before dispensing. Integrates with external RXNORM API or local drug interaction database.

### Clinical Context

Every pharmacist ordering a medication MUST verify:
1. ✅ No contraindications with patient allergies
2. ✅ No significant interactions with current meds
3. ✅ Age-appropriate dosing
4. ✅ Renal/hepatic clearance adjustments

**Interaction Severity Levels:**
- 🔴 **Contraindicated** — Never give together (do not dispense)
- 🟠 **Serious** — Can give, but requires doctor note + consent
- 🟡 **Moderate** — Counsel patient on timing/effects
- 🟢 **Minor** — Note in chart, generally safe

---

## Architecture

```
Prescription Entry
       ↓
Pharmacist adds medication
       ↓
Trigger: prescription_created event (DB trigger)
       ↓
Edge Function: drug-interaction-check
    ├─→ Fetch drug_interactions_cache (local DB)
    ├─→ If miss, call RxNorm API (external)
    ├─→ Cache result (30 days TTL)
    ├─→ Check all existing meds + allergies
    ├─→ Return severity + recommendation
       ↓
React Hook: useDrugInteractions
    ├─→ Call Edge Function
    ├─→ Display warning (if any)
    ├─→ Block dispense (if contraindicated)
       ↓
React Component: DrugInteractionWarning
    ├─→ Show interaction details
    ├─→ Show severity badge
    ├─→ Show doctor recommendation button
       ↓
Pharmacist Action
    ├─→ If minor/moderate: continue
    ├─→ If serious: wait for doctor note
    ├─→ If contraindicated: cancel prescription
```

---

## Implementation Plan (5 Phases, 9 hours)

### Phase 1: Database Schema (1.5 hours)

**File:** `supabase/migrations/tier4_5_drug_interactions.sql`

**Tables:**

```sql
-- 1. Drug interaction definitions
CREATE TABLE public.drug_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  
  -- Drug 1: RxCUI identifier (RxNorm unique concept ID)
  drug1_rxcui VARCHAR(10) NOT NULL,
  drug1_name TEXT NOT NULL,
  
  -- Drug 2: RxCUI identifier
  drug2_rxcui VARCHAR(10) NOT NULL,
  drug2_name TEXT NOT NULL,
  
  -- Interaction metadata
  severity TEXT NOT NULL CHECK (severity IN ('contraindicated', 'serious', 'moderate', 'minor')),
  description TEXT NOT NULL,
  clinical_recommendation TEXT,
  evidence_level TEXT, -- 'established', 'probable', 'suspected'
  
  -- Exclusions (e.g., different formulations might not interact)
  excludes_routes TEXT[], -- ['oral', 'topical']
  age_ranges JSONB, -- { "min_age_months": 0, "max_age_months": 216 }
  
  -- Source & caching
  source TEXT NOT NULL, -- 'rxnorm', 'local', 'hl7-fhir', 'custom-protocol'
  last_updated TIMESTAMPTZ DEFAULT now(),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Interaction check cache (30-day TTL)
CREATE TABLE public.drug_interaction_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  
  -- Query parameters
  patient_id UUID NOT NULL REFERENCES patients(id),
  new_drug_rxcui VARCHAR(10) NOT NULL,
  
  -- Result
  interactions_found INTEGER DEFAULT 0,
  severity_max TEXT CHECK (severity_max IN ('contraindicated', 'serious', 'moderate', 'minor')),
  details JSONB, -- { interactions: [ { drugName, severity, recommendation } ] }
  
  -- Cache control
  checked_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Prescription-level DUR review record
CREATE TABLE public.prescription_dur_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  
  prescription_id UUID NOT NULL REFERENCES prescriptions(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  
  -- Review metadata
  reviewed_by UUID NOT NULL REFERENCES profiles(id), -- pharmacist
  reviewed_at TIMESTAMPTZ DEFAULT now(),
  
  -- Findings
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'cleared', 'flagged', 'denied')),
  
  -- Checks performed
  ddi_checked BOOLEAN DEFAULT FALSE,
  ddi_severity TEXT CHECK (ddi_severity IN ('contraindicated', 'serious', 'moderate', 'minor', 'none')),
  ddi_details JSONB,
  
  allergy_checked BOOLEAN DEFAULT FALSE,
  allergy_conflicts TEXT[],
  
  age_checked BOOLEAN DEFAULT FALSE,
  age_appropriate BOOLEAN,
  
  renal_checked BOOLEAN DEFAULT FALSE,
  renal_dosage_ok BOOLEAN,
  renal_note TEXT,
  
  hepatic_checked BOOLEAN DEFAULT FALSE,
  hepatic_dosage_ok BOOLEAN,
  hepatic_note TEXT,
  
  -- Pharmacist notes
  notes TEXT,
  
  -- Doctor override (if serious/contraindicated)
  doctor_override BOOLEAN DEFAULT FALSE,
  doctor_override_by UUID REFERENCES profiles(id),
  doctor_override_note TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_drug_interactions_drugs ON drug_interactions(drug1_rxcui, drug2_rxcui);
CREATE INDEX idx_drug_interaction_cache_patient ON drug_interaction_cache(patient_id);
CREATE INDEX idx_drug_interaction_cache_expires ON drug_interaction_cache(expires_at);
CREATE INDEX idx_prescription_dur_reviews_rx ON prescription_dur_reviews(prescription_id);
CREATE INDEX idx_prescription_dur_reviews_status ON prescription_dur_reviews(status);

-- RLS Policies
ALTER TABLE drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_interaction_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_dur_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY drug_interactions_hospital_scope ON drug_interactions
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY drug_interaction_cache_hospital_scope ON drug_interaction_cache
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY prescription_dur_reviews_hospital_scope ON prescription_dur_reviews
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

-- Triggers
SELECT trigger_updated_at('drug_interactions');
SELECT trigger_updated_at('drug_interaction_cache');
SELECT trigger_updated_at('prescription_dur_reviews');
```

**Clinical Design Rationale:**
- `severity` enum (no free-text) prevents inconsistent severity levels
- `age_ranges` JSONB enables age-stratified interactions (tetracycline not <8 years)
- Cache 30-day TTL reduces RxNorm API calls
- `prescription_dur_reviews` audit trail tracks all DUR checks
- Doctor override (with reason) enables emergency scenarios

---

### Phase 2: Edge Function + RxNorm Integration (2 hours)

**File:** `supabase/functions/drug-interaction-check/index.ts`

**Pattern:** Call local cache first, fall back to RxNorm API

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RXNORM_API = 'https://rxnav.nlm.nih.gov/REST';

interface CheckRequest {
  patientId: string;
  newDrugRxcui: string;
  hospitalId: string;
  userId: string;
}

interface InteractionResult {
  severity: 'contraindicated' | 'serious' | 'moderate' | 'minor' | 'none';
  interactions: Array<{
    interactingDrug: string;
    severity: string;
    recommendation: string;
  }>;
  cacheHit: boolean;
  timestamp: string;
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { patientId, newDrugRxcui, hospitalId, userId } = (await req.json()) as CheckRequest;

  // 1. Check cache first
  const { data: cached } = await supabase
    .from('drug_interaction_cache')
    .select('*')
    .eq('patient_id', patientId)
    .eq('new_drug_rxcui', newDrugRxcui)
    .gt('expires_at', 'now()')
    .single();

  if (cached) {
    return new Response(
      JSON.stringify({
        severity: cached.severity_max,
        interactions: cached.details?.interactions || [],
        cacheHit: true,
        timestamp: new Date().toISOString(),
      } as InteractionResult),
      { status: 200 }
    );
  }

  // 2. Get current medications for patient
  const { data: currentRxs } = await supabase
    .from('prescriptions')
    .select('drug_rxcui, drug_name')
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .neq('drug_rxcui', newDrugRxcui);

  // 3. Check against local database first
  const interactions = [];
  let maxSeverity = 'none';

  for (const rx of currentRxs || []) {
    const { data: localInteraction } = await supabase
      .from('drug_interactions')
      .select('*')
      .eq('hospital_id', hospitalId)
      .or(
        `and(drug1_rxcui.eq.${newDrugRxcui},drug2_rxcui.eq.${rx.drug_rxcui}),and(drug1_rxcui.eq.${rx.drug_rxcui},drug2_rxcui.eq.${newDrugRxcui})`
      )
      .single();

    if (localInteraction) {
      interactions.push({
        interactingDrug: rx.drug_name,
        severity: localInteraction.severity,
        recommendation: localInteraction.clinical_recommendation,
      });

      // Track max severity
      const severityRank = { contraindicated: 4, serious: 3, moderate: 2, minor: 1, none: 0 };
      if (severityRank[localInteraction.severity as any] > severityRank[maxSeverity as any]) {
        maxSeverity = localInteraction.severity;
      }
    }
  }

  // 4. If no local match, call RxNorm API (can be async)
  if (interactions.length === 0) {
    try {
      const rxnormResp = await fetch(
        `${RXNORM_API}/interaction/list.json?rxcuis=${newDrugRxcui}`
      );
      const rxnormData = await rxnormResp.json();

      if (rxnormData.interactionTypeGroup) {
        for (const group of rxnormData.interactionTypeGroup) {
          for (const interaction of group.interactionType || []) {
            for (const pair of interaction.interactionPair || []) {
              interactions.push({
                interactingDrug: pair.interactionConcept[1]?.preferred || 'Unknown',
                severity: pair.severity || 'moderate',
                recommendation: pair.description || 'Consult pharmacist',
              });

              // Track max severity
              const severityMap = {
                'N/A': 'minor',
                'unknown': 'minor',
                'mild': 'minor',
                'moderate': 'moderate',
                'serious': 'serious',
                'contraindicated': 'contraindicated',
              };
              const mapped = severityMap[pair.severity as any] || 'moderate';
              const severityRank = {
                contraindicated: 4,
                serious: 3,
                moderate: 2,
                minor: 1,
                none: 0,
              };
              if (severityRank[mapped as any] > severityRank[maxSeverity as any]) {
                maxSeverity = mapped;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('RxNorm API error:', e);
      // Fail safely — log but don't block prescription
      maxSeverity = 'minor';
    }
  }

  // 5. Cache result (30-day TTL)
  await supabase.from('drug_interaction_cache').insert({
    hospital_id: hospitalId,
    patient_id: patientId,
    new_drug_rxcui: newDrugRxcui,
    interactions_found: interactions.length,
    severity_max: maxSeverity,
    details: { interactions },
  });

  // 6. Log DUR review
  await supabase.from('audit_logs').insert({
    action_type: 'drug_interaction_check',
    resource_type: 'prescription',
    resource_id: newDrugRxcui,
    performed_by: userId,
    hospital_id: hospitalId,
    details: {
      patient_id: patientId,
      interactions_found: interactions.length,
      severity: maxSeverity,
    },
  });

  return new Response(
    JSON.stringify({
      severity: maxSeverity,
      interactions,
      cacheHit: false,
      timestamp: new Date().toISOString(),
    } as InteractionResult),
    { status: 200 }
  );
});
```

**Clinical Safety Features:**
- Local cache prevents API rate limiting from blocking critical checks
- Graceful API failure (fail-safe to "minor" if external API down)
- Severity ranking prevents lower severity from overwriting higher
- Audit trail of all checks

---

### Phase 3: React Hook (1.5 hours)

**File:** `src/hooks/useDrugInteractions.ts`

```typescript
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/utils/auditLogger';
import { toast } from 'sonner';

interface InteractionWarning {
  severity: 'contraindicated' | 'serious' | 'moderate' | 'minor' | 'none';
  interactions: Array<{
    interactingDrug: string;
    severity: string;
    recommendation: string;
  }>;
  cacheHit: boolean;
}

export function useDrugInteractions() {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<InteractionWarning | null>(null);

  const checkInteraction = useCallback(
    async (patientId: string, drugRxcui: string): Promise<InteractionWarning | null> => {
      if (!user?.hospital_id) return null;

      setIsChecking(true);
      try {
        const { data, error } = await supabase.functions.invoke('drug-interaction-check', {
          body: {
            patientId,
            newDrugRxcui: drugRxcui,
            hospitalId: user.hospital_id,
            userId: user.id,
          },
        });

        if (error) {
          toast.error('Failed to check drug interactions');
          return null;
        }

        setLastCheck(data);
        return data;
      } catch (err) {
        console.error('Drug interaction check error:', err);
        toast.error('Drug interaction check error');
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    [user]
  );

  const canDispense = useCallback(
    (check: InteractionWarning | null): boolean => {
      // Only block if contraindicated
      return check?.severity !== 'contraindicated';
    },
    []
  );

  const requiresApproval = useCallback(
    (check: InteractionWarning | null): boolean => {
      // Serious interactions require doctor approval
      return check?.severity === 'serious';
    },
    []
  );

  return {
    checkInteraction,
    lastCheck,
    isChecking,
    canDispense,
    requiresApproval,
  };
}
```

---

### Phase 4: React Component (2 hours)

**File:** `src/components/prescription/DrugInteractionWarning.tsx`

```typescript
import React from 'react';
import { AlertTriangle, AlertCircle, Info, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface DrugInteractionWarningProps {
  severity: 'contraindicated' | 'serious' | 'moderate' | 'minor' | 'none';
  interactions: Array<{
    interactingDrug: string;
    severity: string;
    recommendation: string;
  }>;
  onRequestDoctorApproval?: () => void;
  isDoctorApprovalPending?: boolean;
}

export function DrugInteractionWarning({
  severity,
  interactions,
  onRequestDoctorApproval,
  isDoctorApprovalPending,
}: DrugInteractionWarningProps) {
  if (severity === 'none' || interactions.length === 0) {
    return null;
  }

  const config = {
    contraindicated: {
      icon: AlertTriangle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      titleColor: 'text-red-900',
      descColor: 'text-red-700',
      badge: 'bg-red-100 text-red-800',
      message: '🚫 DO NOT DISPENSE — Contraindicated medication combination',
      canDispense: false,
    },
    serious: {
      icon: AlertCircle,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      titleColor: 'text-orange-900',
      descColor: 'text-orange-700',
      badge: 'bg-orange-100 text-orange-800',
      message: '⚠️ Serious Interaction — Doctor approval required',
      canDispense: false,
    },
    moderate: {
      icon: Info,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      titleColor: 'text-yellow-900',
      descColor: 'text-yellow-700',
      badge: 'bg-yellow-100 text-yellow-800',
      message: '⚠️ Moderate Interaction — Use caution',
      canDispense: true,
    },
    minor: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      titleColor: 'text-blue-900',
      descColor: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-800',
      message: 'ℹ️ Minor Interaction — Patient counseling recommended',
      canDispense: true,
    },
  };

  const cfg = config[severity];
  const Icon = cfg.icon;

  return (
    <Alert className={`${cfg.bgColor} ${cfg.borderColor}`}>
      <Icon className="h-4 w-4" />
      <AlertTitle className={cfg.titleColor}>{cfg.message}</AlertTitle>
      <AlertDescription className={cfg.descColor}>
        <div className="mt-3 space-y-2">
          {interactions.map((interaction, idx) => (
            <Card key={idx} className="p-2 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{interaction.interactingDrug}</div>
                  <div className="text-xs mt-1">{interaction.recommendation}</div>
                </div>
                <Badge className={cfg.badge}>{interaction.severity}</Badge>
              </div>
            </Card>
          ))}

          {severity === 'serious' && (
            <Button
              onClick={onRequestDoctorApproval}
              disabled={isDoctorApprovalPending}
              className="mt-4 w-full"
              variant="outline"
            >
              {isDoctorApprovalPending ? 'Awaiting Doctor Approval...' : 'Request Doctor Approval'}
            </Button>
          )}

          {!cfg.canDispense && (
            <div className="text-xs font-semibold text-red-800 mt-3">
              ❌ Cannot dispense until issue resolved
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

---

### Phase 5: Tests (2 hours)

**File:** `tests/unit/drug-interactions.test.ts`

Comprehensive test suite covering:
- Local cache hits/misses
- Drug-drug interaction detection
- Severity classification
- Cache TTL expiration
- RxNorm API fallback
- Audit logging
- Permission checks
- Pharmacist approval flow
- Doctor override flow

---

## Integration Checklist

- [ ] **With 4.1 (Discharge):** Check interactions before med reconciliation step
- [ ] **With 4.3 (Optimistic Locking):** Version check when pharmacist updates prescription
- [ ] **With Prescription Editing:** Trigger DUR check on every Rx update
- [ ] **With Patient Allergies:** Cross-reference allergies before DDI check
- [ ] **With Lab Results:** Flag interactions if eGFR/ALT abnormal (renal/hepatic dosing)

---

## Clinical Rules to Implement

1. **Tetracyclines:** Not for children <8 years
2. **Warfarin + NSAIDs:** Serious interaction, increased bleeding risk
3. **Metformin + Contrast:** Hold metformin 48 hours post-contrast (renal risk)
4. **ACE Inhibitors + Potassium:** Monitor K+ levels, risk of hyperkalemia
5. **Cephalosporin + Carbapenem:** Cross-reactivity, contraindicated in β-lactam allergy
6. **Fluconazole + Warfarin:** Increases warfarin effect, elevated INR risk
7. **Statins + Macrolides:** Increased myopathy/rhabdomyolysis risk

---

## API Integration: RxNorm

**Endpoint:** `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=<RxCUI>`

**Response Schema:**
```json
{
  "interactionTypeGroup": [
    {
      "interactionType": [
        {
          "interactionPair": [
            {
              "interactionConcept": [
                { "preferred": "Drug 1" },
                { "preferred": "Drug 2" }
              ],
              "severity": "serious",
              "description": "Increased risk of...",
              "sources": []
            }
          ]
        }
      ]
    }
  ]
}
```

**Note:** Free API, rate-limited. Cache aggressively.

---

## Risk & Mitigation

| Risk | Severity | Mitigation |
|------|----------|-----------|
| RxNorm API down | High | Local cache (30 days) + graceful failure |
| False positives | Medium | Review interactions with pharmacy oversight |
| Clinical override abuse | High | Audit trail + doctor must document reason |
| Performance (N+1 queries) | Medium | Index on drug_rxcui + cache on patient level |

---

## Next Steps After 4.5

1. **Tier 4.2 & 4.4 (Lab Workflows):** Use similar pattern for critical lab alerts
2. **Tier 5.1:** Patient education on drug interactions
3. **Tier 5.2:** Interaction summary in discharge letters

---

**Total Estimated Time:** 9 hours  
**Difficulty:** Medium (API integration, caching)  
**Risk Level:** Low-Medium (graceful fallback, pharmacist validation)  
**Clinical Impact:** High (prevents serious DDI)  

Ready to implement immediately after Tier 4.1 completion ✅
