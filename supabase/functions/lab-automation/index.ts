import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get user profile to determine hospital_id
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('hospital_id')
      .eq('id', user.id)
      .single()

    if (!profile?.hospital_id) {
      return new Response(JSON.stringify({ error: 'Hospital not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

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
        const body = await req.json()
        const { data, error } = await supabaseClient
          .from('lab_samples')
          .insert({
            ...body,
            hospital_id: profile.hospital_id,
            collector_id: user.id
          })
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update_lab_sample': {
        const body = await req.json()
        const { id, ...updates } = body
        const { data, error } = await supabaseClient
          .from('lab_samples')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('hospital_id', profile.hospital_id)
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'track_sample_movement': {
        const body = await req.json()
        const { data, error } = await supabaseClient
          .from('sample_tracking')
          .insert({
            ...body,
            user_id: user.id,
            hospital_id: profile.hospital_id,
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
        const body = await req.json()
        const { data, error } = await supabaseClient
          .from('quality_control')
          .insert({
            ...body,
            technician_id: user.id,
            hospital_id: profile.hospital_id,
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
        const days = parseInt(url.searchParams.get('days') || '30')

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
        const days = parseInt(url.searchParams.get('days') || '7')

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
        const days = parseInt(url.searchParams.get('days') || '30')

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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})