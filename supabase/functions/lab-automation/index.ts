import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getAuthorizedActor } from '../_shared/authorize.ts'
import { withRateLimit } from '../_shared/rateLimit.ts'
import {
  assertPatientInHospital,
  clampInt,
  findInHospital,
  hasAnyRole,
  isUuid,
  pickAllowedFields,
} from '../_shared/tenantScope.ts'

// S0-06 / EDGE-08: actor and hospital come from the JWT; writes take explicit
// column allowlists (hospital_id, collector_id, created_at... are rejected with
// 400); patient, sample and equipment ids are checked against the caller's hospital.

const SAMPLE_CREATE_FIELDS = [
  'sample_id', 'patient_id', 'test_type', 'status', 'priority', 'collected_at', 'received_at',
  'location', 'temperature', 'volume', 'notes',
]
const SAMPLE_UPDATE_FIELDS = [
  'status', 'priority', 'received_at', 'processed_at', 'completed_at', 'technician_id',
  'location', 'temperature', 'volume', 'notes', 'rejection_reason',
]
const TRACKING_FIELDS = ['sample_id', 'location', 'action', 'temperature', 'notes']
const QC_FIELDS = [
  'test_type', 'control_lot', 'control_level', 'expected_value', 'expected_range_min',
  'expected_range_max', 'measured_value', 'result', 'equipment_id', 'notes',
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

  const { actor, response: authError } = await getAuthorizedActor(req, ['admin', 'doctor', 'nurse', 'lab_technician'])
  if (authError || !actor) return authError ?? json(401, { error: 'Unauthorized' })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const db = supabaseClient as never
    const user = { id: actor.userId }
    const profile = { hospital_id: actor.hospitalId }

    const readBody = async (): Promise<Record<string, unknown>> => {
      const body = await req.json().catch(() => null)
      return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
    }

    /** lab_samples row in the caller's hospital, by its text sample_id or its uuid. */
    const findSample = async (sampleId: unknown) =>
      (await findInHospital(db, 'lab_samples', sampleId, actor.hospitalId, { column: 'sample_id', select: 'id, sample_id, hospital_id' })) ??
      (isUuid(sampleId) ? await findInHospital(db, 'lab_samples', sampleId, actor.hospitalId, { select: 'id, sample_id, hospital_id' }) : null)

    const requireProfile = (): Response | null =>
      actor.profileId ? null : json(403, { error: 'Forbidden - caller has no staff profile' })

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    switch (action) {
      case 'get_lab_samples': {
        const status = url.searchParams.get('status')
        const priority = url.searchParams.get('priority')

        let query = supabaseClient
          .from('lab_samples')
          .select(`
            *,
            patient:patients(first_name, last_name, medical_record_number),
            collector:profiles(first_name, last_name),
            technician:profiles(first_name, last_name)
          `)
          .eq('hospital_id', profile.hospital_id)
          .order('created_at', { ascending: false })

        if (status && status !== 'all') {
          query = query.eq('status', status)
        }
        if (priority && priority !== 'all') {
          query = query.eq('priority', priority)
        }

        const { data, error } = await query
        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'create_lab_sample': {
        const denied = requireProfile()
        if (denied) return denied
        const fields = pickAllowedFields(await readBody(), SAMPLE_CREATE_FIELDS)
        if (!fields.ok) return json(fields.status, { error: fields.error })
        if (!(await assertPatientInHospital(db, fields.value.patient_id, actor.hospitalId))) {
          return json(403, { error: 'Forbidden - patient not found in caller hospital' })
        }
        const { data, error } = await supabaseClient
          .from('lab_samples')
          .insert({
            ...fields.value,
            hospital_id: actor.hospitalId,
            // collector_id references profiles(id)
            collector_id: actor.profileId
          })
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update_lab_sample': {
        const { id, ...rest } = await readBody()
        if (!isUuid(id)) return json(400, { error: 'id must be a UUID' })
        const fields = pickAllowedFields(rest, SAMPLE_UPDATE_FIELDS)
        if (!fields.ok) return json(fields.status, { error: fields.error })
        if (fields.value.technician_id != null &&
            !(await findInHospital(db, 'profiles', fields.value.technician_id, actor.hospitalId))) {
          return json(403, { error: 'Forbidden - technician not found in caller hospital' })
        }
        const { data, error } = await supabaseClient
          .from('lab_samples')
          .update({
            ...fields.value,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('hospital_id', actor.hospitalId)
          .select()
          .maybeSingle()

        if (error) throw error
        if (!data) return json(404, { error: 'Sample not found' })
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'track_sample_movement': {
        const denied = requireProfile()
        if (denied) return denied
        const fields = pickAllowedFields(await readBody(), TRACKING_FIELDS)
        if (!fields.ok) return json(fields.status, { error: fields.error })
        if (!(await findSample(fields.value.sample_id))) {
          return json(403, { error: 'Forbidden - sample not found in caller hospital' })
        }
        const { data, error } = await supabaseClient
          .from('sample_tracking')
          .insert({
            ...fields.value,
            // user_id references profiles(id)
            user_id: actor.profileId,
            hospital_id: actor.hospitalId,
            timestamp: new Date().toISOString()
          })
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_sample_history': {
        const sampleId = url.searchParams.get('sample_id')
        if (!sampleId) {
          return new Response(JSON.stringify({ error: 'Sample ID required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const { data, error } = await supabaseClient
          .from('sample_tracking')
          .select(`
            *,
            user:profiles(first_name, last_name)
          `)
          .eq('sample_id', sampleId)
          .eq('hospital_id', profile.hospital_id)
          .order('timestamp', { ascending: true })

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'perform_qc_test': {
        if (!hasAnyRole(actor, ['lab_technician', 'admin'])) {
          return json(403, { error: 'Forbidden - lab technician or admin only' })
        }
        const denied = requireProfile()
        if (denied) return denied
        const fields = pickAllowedFields(await readBody(), QC_FIELDS)
        if (!fields.ok) return json(fields.status, { error: fields.error })
        if (fields.value.equipment_id != null &&
            !(await findInHospital(db, 'lab_equipment', fields.value.equipment_id, actor.hospitalId))) {
          return json(403, { error: 'Forbidden - equipment not found in caller hospital' })
        }
        const { data, error } = await supabaseClient
          .from('quality_control')
          .insert({
            ...fields.value,
            // technician_id references profiles(id)
            technician_id: actor.profileId,
            hospital_id: actor.hospitalId,
            performed_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_qc_results': {
        const testType = url.searchParams.get('test_type')
        const days = clampInt(url.searchParams.get('days'), { min: 1, max: 365, fallback: 30 })

        let query = supabaseClient
          .from('quality_control')
          .select(`
            *,
            technician:profiles(first_name, last_name),
            equipment:lab_equipment(name, model)
          `)
          .eq('hospital_id', profile.hospital_id)
          .gte('performed_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
          .order('performed_at', { ascending: false })

        if (testType && testType !== 'all') {
          query = query.eq('test_type', testType)
        }

        const { data, error } = await query
        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_critical_results': {
        const status = url.searchParams.get('status') || 'all'

        let query = supabaseClient
          .from('critical_results')
          .select(`
            *,
            patient:patients(first_name, last_name, medical_record_number),
            acknowledged_by_user:profiles!critical_results_acknowledged_by_fkey(first_name, last_name),
            reviewed_by_user:profiles!critical_results_reviewed_by_fkey(first_name, last_name)
          `)
          .eq('hospital_id', profile.hospital_id)
          .order('created_at', { ascending: false })

        if (status !== 'all') {
          query = query.eq('status', status)
        }

        const { data, error } = await query
        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'acknowledge_critical_result': {
        const body = await req.json()
        const { result_id, notes } = body

        const { data, error } = await supabaseClient
          .from('critical_results')
          .update({
            status: 'acknowledged',
            acknowledged_by: user.id,
            acknowledged_at: new Date().toISOString(),
            notes: notes
          })
          .eq('id', result_id)
          .eq('hospital_id', profile.hospital_id)
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'review_critical_result': {
        const body = await req.json()
        const { result_id, notes } = body

        const { data, error } = await supabaseClient
          .from('critical_results')
          .update({
            status: 'reviewed',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            notes: notes
          })
          .eq('id', result_id)
          .eq('hospital_id', profile.hospital_id)
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_lab_equipment': {
        const { data, error } = await supabaseClient
          .from('lab_equipment')
          .select('*')
          .eq('hospital_id', profile.hospital_id)
          .order('name')

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_processing_metrics': {
        const days = clampInt(url.searchParams.get('days'), { min: 1, max: 365, fallback: 7 })

        const { data, error } = await supabaseClient
          .rpc('get_sample_processing_metrics', {
            p_hospital_id: profile.hospital_id,
            p_days: days
          })

        if (error) throw error
        return new Response(JSON.stringify(data[0] || {}), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_qc_statistics': {
        const testType = url.searchParams.get('test_type') || 'Hemoglobin'
        const days = clampInt(url.searchParams.get('days'), { min: 1, max: 365, fallback: 30 })

        const { data, error } = await supabaseClient
          .rpc('calculate_qc_statistics', {
            p_test_type: testType,
            p_hospital_id: profile.hospital_id,
            p_days: days
          })

        if (error) throw error
        return new Response(JSON.stringify(data[0] || {}), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_overdue_samples': {
        const { data, error } = await supabaseClient
          .rpc('get_overdue_samples', {
            p_hospital_id: profile.hospital_id
          })

        if (error) throw error
        return new Response(JSON.stringify(data || []), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
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
