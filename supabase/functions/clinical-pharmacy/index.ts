import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getAuthorizedActor } from '../_shared/authorize.ts'
import { withRateLimit } from '../_shared/rateLimit.ts'
import {
  assertPatientInHospital,
  findInHospital,
  hasAnyRole,
  isUuid,
  pickAllowedFields,
} from '../_shared/tenantScope.ts'

// S0-06 / EDGE-08: actor and hospital come from the JWT; writes take explicit
// column allowlists (hospital_id, pharmacist_id, patient_id on update,
// created_at... are rejected with 400); every patient / prescription / physician
// id is checked against the caller's hospital; pharmacist-only writes are enforced.

const INTERVENTION_FIELDS = [
  'prescription_id', 'intervention_type', 'severity_level', 'description', 'recommendation',
  'physician_id', 'status', 'outcome', 'follow_up_required', 'follow_up_date', 'documentation',
]
const REVIEW_FIELDS = [
  'review_type', 'indications_assessed', 'drug_therapy_problems', 'recommendations',
  'physician_response', 'patient_education_provided', 'follow_up_scheduled', 'follow_up_date', 'documentation',
]
const DUR_FIELDS = [
  'prescription_id', 'criteria_id', 'finding_type', 'severity', 'description', 'potential_risk',
  'recommendation', 'pharmacist_reviewed', 'resolution_status', 'resolution_notes',
]

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  const json = (status: number, payload: unknown) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  const { actor, response: authError } = await getAuthorizedActor(req, ['admin', 'doctor', 'nurse', 'pharmacist'])
  if (authError || !actor) return authError ?? json(401, { error: 'Unauthorized' })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const db = supabaseClient as never
    const hospitalId = actor.hospitalId

    const readBody = async (): Promise<Record<string, unknown>> => {
      const body = await req.json().catch(() => null)
      return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
    }

    /** Allowlist the body and check every foreign key against the caller's hospital. */
    const prepareWrite = async (
      body: Record<string, unknown>,
      allowed: string[],
      requirePatient: boolean,
    ): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; response: Response }> => {
      const fields = pickAllowedFields(body, requirePatient ? [...allowed, 'patient_id'] : allowed)
      if (!fields.ok) return { ok: false, response: json(fields.status, { error: fields.error }) }
      const v = fields.value
      if (requirePatient && !(await assertPatientInHospital(db, v.patient_id, hospitalId))) {
        return { ok: false, response: json(403, { error: 'Forbidden - patient not found in caller hospital' }) }
      }
      if (v.prescription_id != null && !(await findInHospital(db, 'prescriptions', v.prescription_id, hospitalId))) {
        return { ok: false, response: json(403, { error: 'Forbidden - prescription not found in caller hospital' }) }
      }
      if (v.physician_id != null && !(await findInHospital(db, 'profiles', v.physician_id, hospitalId))) {
        return { ok: false, response: json(403, { error: 'Forbidden - physician not found in caller hospital' }) }
      }
      return { ok: true, value: v }
    }

    const requirePharmacist = (): Response | null => {
      if (!hasAnyRole(actor, ['pharmacist'])) return json(403, { error: 'Forbidden - pharmacist only' })
      if (!actor.profileId) return json(403, { error: 'Forbidden - caller has no staff profile' })
      return null
    }

    /** `{ id, ...updates }` -> scoped update returning 404 when the row is not in the caller's hospital. */
    const scopedUpdate = async (table: string, body: Record<string, unknown>, allowed: string[], extra: Record<string, unknown> = {}) => {
      const { id, ...rest } = body
      if (!isUuid(id)) return json(400, { error: 'id must be a UUID' })
      const prepared = await prepareWrite(rest, allowed, false)
      if (!prepared.ok) return prepared.response
      const { data, error } = await supabaseClient
        .from(table)
        .update({ ...prepared.value, ...extra })
        .eq('id', id)
        .eq('hospital_id', hospitalId)
        .select()
        .maybeSingle()
      if (error) throw error
      if (!data) return json(404, { error: 'Not found' })
      return json(200, data)
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    switch (action) {
      case 'get_clinical_interventions': {
        const { data, error } = await supabaseClient
          .from('clinical_interventions')
          .select(`
            *,
            patient:patients(first_name, last_name),
            pharmacist:profiles(first_name, last_name),
            physician:profiles(first_name, last_name)
          `)
          .eq('hospital_id', hospitalId)
          .order('created_at', { ascending: false })

        if (error) throw error
        return json(200, data)
      }

      case 'get_medication_therapy_reviews': {
        const { data, error } = await supabaseClient
          .from('medication_therapy_reviews')
          .select(`
            *,
            patient:patients(first_name, last_name),
            pharmacist:profiles(first_name, last_name)
          `)
          .eq('hospital_id', hospitalId)
          .order('created_at', { ascending: false })

        if (error) throw error
        return json(200, data)
      }

      case 'insert_clinical_intervention': {
        const denied = requirePharmacist()
        if (denied) return denied
        const prepared = await prepareWrite(await readBody(), INTERVENTION_FIELDS, true)
        if (!prepared.ok) return prepared.response
        const { data, error } = await supabaseClient
          .from('clinical_interventions')
          .insert({
            ...prepared.value,
            hospital_id: hospitalId,
            pharmacist_id: actor.profileId,
          })
          .select()
          .single()

        if (error) throw error
        return json(200, data)
      }

      case 'update_clinical_intervention': {
        const denied = requirePharmacist()
        if (denied) return denied
        return await scopedUpdate('clinical_interventions', await readBody(), INTERVENTION_FIELDS)
      }

      case 'insert_medication_therapy_review': {
        const denied = requirePharmacist()
        if (denied) return denied
        const prepared = await prepareWrite(await readBody(), REVIEW_FIELDS, true)
        if (!prepared.ok) return prepared.response
        const { data, error } = await supabaseClient
          .from('medication_therapy_reviews')
          .insert({
            ...prepared.value,
            hospital_id: hospitalId,
            pharmacist_id: actor.profileId,
          })
          .select()
          .single()

        if (error) throw error
        return json(200, data)
      }

      case 'update_medication_therapy_review': {
        const denied = requirePharmacist()
        if (denied) return denied
        return await scopedUpdate('medication_therapy_reviews', await readBody(), REVIEW_FIELDS)
      }

      case 'perform_dur_analysis': {
        const { patient_id } = await readBody()
        // The RPC is SECURITY DEFINER and takes only a patient id (DB-05), so
        // the tenant check happens here before it is called.
        if (!(await assertPatientInHospital(db, patient_id, hospitalId))) {
          return json(403, { error: 'Forbidden - patient not found in caller hospital' })
        }

        const { data, error } = await supabaseClient
          .rpc('perform_dur_analysis', { patient_uuid: patient_id })

        if (error) throw error
        return json(200, data)
      }

      case 'get_dur_findings': {
        const { data, error } = await supabaseClient
          .from('dur_findings')
          .select(`
            *,
            patient:patients(first_name, last_name),
            prescription:prescriptions(drug_name, dosage),
            criteria:dur_criteria(criteria_name, severity_level)
          `)
          .eq('hospital_id', hospitalId)
          .order('created_at', { ascending: false })

        if (error) throw error
        return json(200, data)
      }

      case 'insert_dur_finding': {
        const denied = requirePharmacist()
        if (denied) return denied
        const prepared = await prepareWrite(await readBody(), DUR_FIELDS, true)
        if (!prepared.ok) return prepared.response
        const { data, error } = await supabaseClient
          .from('dur_findings')
          .insert({
            ...prepared.value,
            hospital_id: hospitalId,
            pharmacist_id: actor.profileId,
          })
          .select()
          .single()

        if (error) throw error
        return json(200, data)
      }

      case 'update_dur_finding': {
        const denied = requirePharmacist()
        if (denied) return denied
        return await scopedUpdate('dur_findings', await readBody(), DUR_FIELDS, { pharmacist_id: actor.profileId })
      }

      case 'get_clinical_stats': {
        const [
          { count: interventions },
          { count: reviews },
          { count: findings }
        ] = await Promise.all([
          supabaseClient
            .from('clinical_interventions')
            .select('*', { count: 'exact', head: true })
            .eq('hospital_id', hospitalId),
          supabaseClient
            .from('medication_therapy_reviews')
            .select('*', { count: 'exact', head: true })
            .eq('hospital_id', hospitalId),
          supabaseClient
            .from('dur_findings')
            .select('*', { count: 'exact', head: true })
            .eq('hospital_id', hospitalId)
            .eq('resolution_status', 'pending')
        ])

        return json(200, {
          total_interventions: interventions,
          total_reviews: reviews,
          pending_findings: findings,
          resolved_today: 0 // Would need more complex query
        })
      }

      default:
        return json(400, { error: 'Invalid action' })
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    })
  }
}

serve((req) => withRateLimit(req, handler));
