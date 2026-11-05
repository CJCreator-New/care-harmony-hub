/**
 * Production Adapters for OrderSafetyEngine Ports
 * Interfaces with Supabase PostgreSQL and RxNorm REST API.
 */

import { supabase } from '@/integrations/supabase/client';
import { fieldEncryption } from '@/utils/dataProtection';
import { mergeIntakeIntoPatientRecord, type IntakeClinicalText } from '../core/intakeRecord';
import {
  ageFromDateOfBirth,
  mapGender,
  medicationsFromRecord,
  normalizeAllergyList,
} from '../core/orderIntent';
import {
  ActivePatientMedication,
  AuditLoggerPort,
  AuditSafetyEvent,
  LocalContraindicationRule,
  LocalDdiRepositoryPort,
  RxNormTerminologyPort,
  TerminologyInteraction,
} from '../ports';

export class SupabaseLocalDdiAdapter implements LocalDdiRepositoryPort {
  async getPatientActiveMedications(
    patientId: string,
    hospitalId: string
  ): Promise<readonly ActivePatientMedication[]> {
    const { medications } = await loadActivePrescriptionMedications(patientId, hospitalId);
    return medications;
  }

  async findLocalContraindications(
    drugNameOrRxcui: string,
    hospitalId: string
  ): Promise<readonly LocalContraindicationRule[]> {
    // Only letters, digits, spaces, dots and hyphens reach the PostgREST filter:
    // commas, parentheses and quotes would change the .or() expression (SECF-18).
    const term = drugNameOrRxcui.replace(/[^a-zA-Z0-9 .-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (term.length < 2) return [];
    try {
      const { data, error } = await supabase
        .from('drug_interactions')
        .select('drug_a, drug_b, severity, description')
        .eq('hospital_id', hospitalId)
        .or(`drug_a.ilike.%${term}%,drug_b.ilike.%${term}%`);

      if (error || !data) return [];

      return data.map((row: any) => {
        const isDrugA = String(row.drug_a || '').toLowerCase().includes(term.toLowerCase());
        const otherDrug = isDrugA ? row.drug_b : row.drug_a;
        return {
          primaryDrug: drugNameOrRxcui,
          interactingDrug: otherDrug,
          severity: row.severity === 'contraindicated' ? 'contraindicated' : 'serious',
          clinicalRecommendation: row.description || 'Consult with clinical pharmacist.',
        };
      });
    } catch {
      return [];
    }
  }
}

export class HttpRxNormAdapter implements RxNormTerminologyPort {
  private readonly baseUrl = 'https://rxnav.nlm.nih.gov/REST';
  private readonly timeoutMs: number;

  constructor(timeoutMs = 4000) {
    this.timeoutMs = timeoutMs;
  }

  async checkInteractions(
    rxcuis: readonly string[],
    signal?: AbortSignal
  ): Promise<{
    readonly interactions: readonly TerminologyInteraction[];
    readonly isDegraded: boolean;
    readonly error?: string;
  }> {
    if (rxcuis.length < 2) {
      return { interactions: [], isDegraded: false };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    // If caller provided an abort signal, listen to it
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const query = rxcuis.join('+');
      const res = await fetch(`${this.baseUrl}/interaction/list.json?rxcuis=${query}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        return {
          interactions: [],
          isDegraded: true,
          error: `RxNorm API responded with HTTP status ${res.status}`,
        };
      }

      const data = await res.json();
      const interactions: TerminologyInteraction[] = [];

      if (data?.interactionTypeGroup) {
        for (const group of data.interactionTypeGroup) {
          for (const type of group.interactionType || []) {
            for (const pair of type.interactionPair || []) {
              const concepts = pair.interactionConcept || [];
              const drug1 = concepts[0]?.minConceptItem?.name || 'Drug A';
              const drug2 = concepts[1]?.minConceptItem?.name || 'Drug B';
              const severityRaw = pair.severity?.toLowerCase() || 'unknown';
              const severity: 'high' | 'medium' | 'low' | 'unknown' =
                severityRaw === 'high' || severityRaw === 'contraindicated'
                  ? 'high'
                  : severityRaw === 'moderate'
                    ? 'medium'
                    : 'low';

              interactions.push({
                drug1,
                drug2,
                severity,
                description: pair.description || 'Potential clinical interaction.',
              });
            }
          }
        }
      }

      return { interactions, isDegraded: false };
    } catch (err: any) {
      const isAbort = err.name === 'AbortError';
      return {
        interactions: [],
        isDegraded: true,
        error: isAbort ? `RxNorm API timed out after ${this.timeoutMs}ms` : err.message,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Writes order-safety audit events to public.activity_logs, the audit table the
 * rest of the application uses (public.audit_logs is not present in the live
 * schema; see docs/repository-audit DB-08).
 */
export class SupabaseActivityLogAuditAdapter implements AuditLoggerPort {
  async logSafetyEvent(event: AuditSafetyEvent): Promise<string> {
    try {
      const overridesCount = Number((event.details as Record<string, unknown>)?.overridesCount ?? 0);
      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          hospital_id: event.hospitalId,
          user_id: event.performedBy,
          action_type: event.actionType,
          entity_type: event.resourceType,
          entity_id: event.resourceId ?? null,
          details: event.details,
          severity: overridesCount > 0 ? 'warning' : 'info',
        })
        .select('id')
        .single();
      if (error) {
        console.warn('Failed to insert order safety activity log entry:', error.message);
        return 'unrecorded-audit-fallback';
      }
      return data?.id || 'logged-audit-id';
    } catch (err) {
      console.warn('Activity log audit exception:', err);
      return 'unrecorded-audit-exception';
    }
  }
}

/** @deprecated writes to public.audit_logs, which the live schema lacks. Use SupabaseActivityLogAuditAdapter. */
export class SupabaseAuditLoggerAdapter implements AuditLoggerPort {
  async logSafetyEvent(event: AuditSafetyEvent): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          hospital_id: event.hospitalId,
          performed_by: event.performedBy,
          action_type: event.actionType,
          resource_type: event.resourceType,
          resource_id: event.resourceId || '00000000-0000-0000-0000-000000000000',
          details: event.details,
        })
        .select('id')
        .single();

      if (error) {
        console.warn('Failed to insert order safety audit log entry:', error.message);
        return 'unrecorded-audit-fallback';
      }

      return data?.id || 'logged-audit-id';
    } catch (err) {
      console.warn('Audit logger exception:', err);
      return 'unrecorded-audit-exception';
    }
  }
}

// ─── Patient clinical context loader (fail-closed) ─────────────────────────────

const INACTIVE_PRESCRIPTION_STATUSES = '(cancelled,rejected,discontinued,expired)';
const ENCRYPTED_PREFIX = '__ENCRYPTED__';

/**
 * Medications on the patient's recent, not-cancelled prescriptions in this
 * hospital. Encrypted medication names are decrypted in one batch. Anything
 * that cannot be read is reported in `gaps`, never silently dropped.
 */
export async function loadActivePrescriptionMedications(
  patientId: string,
  hospitalId: string,
  options: { excludePrescriptionId?: string; lookbackDays?: number } = {}
): Promise<{ medications: ActivePatientMedication[]; gaps: string[] }> {
  const gaps: string[] = [];
  const since = new Date(Date.now() - (options.lookbackDays ?? 90) * 86400000).toISOString();
  let query = supabase
    .from('prescriptions')
    .select('id, status, created_at, prescription_items(*)')
    .eq('patient_id', patientId)
    .eq('hospital_id', hospitalId)
    .gte('created_at', since)
    .not('status', 'in', INACTIVE_PRESCRIPTION_STATUSES);
  if (options.excludePrescriptionId) query = query.neq('id', options.excludePrescriptionId);

  const { data, error } = await query;
  if (error) {
    return { medications: [], gaps: ['existing prescriptions could not be loaded'] };
  }

  const items = (data || []).flatMap((rx: any) => (Array.isArray(rx.prescription_items) ? rx.prescription_items : []));
  const plain: string[] = [];
  const encrypted: Array<{ meta: any }> = [];
  let unreadable = 0;
  for (const item of items) {
    const name = typeof item?.medication_name === 'string' ? item.medication_name : '';
    if (!name) continue;
    if (name.startsWith(ENCRYPTED_PREFIX)) {
      const meta = item?.encryption_metadata?.medication_name;
      if (meta) encrypted.push({ meta });
      else unreadable++;
    } else {
      plain.push(name);
    }
  }
  if (encrypted.length > 0) {
    try {
      const decrypted = await fieldEncryption.decryptFields(encrypted.map((e) => e.meta));
      decrypted.forEach((n) => {
        if (typeof n === 'string' && n && !n.startsWith(ENCRYPTED_PREFIX)) plain.push(n);
        else unreadable++;
      });
    } catch {
      unreadable += encrypted.length;
    }
  }
  if (unreadable > 0) {
    gaps.push(`${unreadable} existing prescription item(s) could not be decrypted for interaction screening`);
  }
  const medications = [...new Map(plain.map((n) => [n.toLowerCase().trim(), { drugName: n.trim() }])).values()];
  return { medications, gaps };
}

export interface LoadedPatientRecord {
  readonly patientId: string;
  readonly hospitalId: string;
  readonly ageYears?: number;
  readonly ageMonths?: number;
  readonly gender?: 'M' | 'F' | 'O';
  readonly allergies: string[];
  readonly allergyStatusUnknown: boolean;
  readonly homeMedications: Array<{ drugName: string; dosageMg?: number }>;
  readonly activePrescriptionMedications: ActivePatientMedication[];
  readonly gaps: string[];
}

/**
 * Loads everything the order-safety engine needs about a patient. Never throws:
 * failures become `gaps`, which the engine turns into a fail-closed finding.
 */
export async function loadPatientClinicalRecord(
  patientId: string,
  options: { excludePrescriptionId?: string; lookbackDays?: number } = {}
): Promise<LoadedPatientRecord | null> {
  const { data: patient, error } = await supabase
    .from('patients')
    .select('id, hospital_id, date_of_birth, gender, allergies, current_medications')
    .eq('id', patientId)
    .maybeSingle();

  if (error || !patient) return null;

  const gaps: string[] = [];
  const age = ageFromDateOfBirth((patient as any).date_of_birth);
  if (!age) gaps.push('date of birth missing or invalid (pediatric dose screening not possible)');
  const { allergies, recorded } = normalizeAllergyList((patient as any).allergies);
  const homeMedications = medicationsFromRecord((patient as any).current_medications);

  let activePrescriptionMedications: ActivePatientMedication[] = [];
  try {
    const active = await loadActivePrescriptionMedications(patientId, (patient as any).hospital_id, options);
    activePrescriptionMedications = active.medications;
    gaps.push(...active.gaps);
  } catch {
    gaps.push('existing prescriptions could not be loaded');
  }

  return {
    patientId,
    hospitalId: (patient as any).hospital_id,
    ...(age ? { ageYears: age.ageYears, ageMonths: age.ageMonths } : {}),
    gender: mapGender((patient as any).gender),
    allergies,
    allergyStatusUnknown: !recorded,
    homeMedications,
    activePrescriptionMedications,
    gaps,
  };
}

/**
 * Writes allergies / home medications captured at intake into the patient's
 * structured record (CLIN-14). Additive merge, see `mergeIntakeIntoPatientRecord`.
 * Never throws; callers should warn the user when `ok` is false, because the
 * prescriber's safety screen will not see the intake allergies.
 */
export async function writeIntakeToPatientRecord(
  patientId: string,
  intake: IntakeClinicalText
): Promise<{ ok: boolean; changed: boolean; error?: string }> {
  try {
    if (!patientId) return { ok: false, changed: false, error: 'patient id missing' };
    if (!intake.allergies?.trim() && !intake.currentMedications?.trim()) return { ok: true, changed: false };
    const { data, error } = await supabase
      .from('patients')
      .select('allergies, current_medications')
      .eq('id', patientId)
      .maybeSingle();
    if (error || !data) return { ok: false, changed: false, error: error?.message ?? 'patient not found' };
    const patch = mergeIntakeIntoPatientRecord(data as any, intake);
    if (!patch) return { ok: true, changed: false };
    const { error: updateError } = await supabase
      .from('patients')
      .update(patch as any)
      .eq('id', patientId);
    if (updateError) return { ok: false, changed: false, error: updateError.message };
    return { ok: true, changed: true };
  } catch (err) {
    return { ok: false, changed: false, error: err instanceof Error ? err.message : String(err) };
  }
}
