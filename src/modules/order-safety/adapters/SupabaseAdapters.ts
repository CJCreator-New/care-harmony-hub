/**
 * Production Adapters for OrderSafetyEngine Ports
 * Interfaces with Supabase PostgreSQL and RxNorm REST API.
 */

import { supabase } from '@/integrations/supabase/client';
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
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('drug_name, drug_rxcui, dosage')
        .eq('patient_id', patientId)
        .eq('hospital_id', hospitalId)
        .eq('status', 'active');

      if (error) {
        console.warn('Failed to fetch patient active prescriptions from Supabase:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        drugName: row.drug_name || '',
        drugRxcui: row.drug_rxcui || undefined,
        dosageMg: typeof row.dosage === 'number' ? row.dosage : undefined,
      }));
    } catch (err) {
      console.warn('Unexpected error in SupabaseLocalDdiAdapter:', err);
      return [];
    }
  }

  async findLocalContraindications(
    drugNameOrRxcui: string,
    hospitalId: string
  ): Promise<readonly LocalContraindicationRule[]> {
    try {
      const { data, error } = await supabase
        .from('drug_interactions')
        .select('drug_a, drug_b, severity, description')
        .eq('hospital_id', hospitalId)
        .or(`drug_a.ilike.%${drugNameOrRxcui}%,drug_b.ilike.%${drugNameOrRxcui}%`);

      if (error || !data) return [];

      return data.map((row: any) => {
        const isDrugA = row.drug_a.toLowerCase().includes(drugNameOrRxcui.toLowerCase());
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
