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
      case 'get_clinical_interventions': {
        const { data, error } = await supabaseClient
          .from('clinical_interventions')
          .select(`
            *,
            patient:patients(first_name, last_name),
            pharmacist:profiles(first_name, last_name),
            physician:profiles(first_name, last_name)
          `)
          .eq('hospital_id', profile.hospital_id)
          .order('created_at', { ascending: false })

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_medication_therapy_reviews': {
        const { data, error } = await supabaseClient
          .from('medication_therapy_reviews')
          .select(`
            *,
            patient:patients(first_name, last_name),
            pharmacist:profiles(first_name, last_name)
          `)
          .eq('hospital_id', profile.hospital_id)
          .order('created_at', { ascending: false })

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'insert_clinical_intervention': {
        const body = await req.json()
        const { data, error } = await supabaseClient
          .from('clinical_interventions')
          .insert({
            ...body,
            hospital_id: profile.hospital_id,
            pharmacist_id: user.id
          })
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update_clinical_intervention': {
        const body = await req.json()
        const { id, ...updates } = body
        const { data, error } = await supabaseClient
          .from('clinical_interventions')
          .update(updates)
          .eq('id', id)
          .eq('hospital_id', profile.hospital_id)
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'insert_medication_therapy_review': {
        const body = await req.json()
        const { data, error } = await supabaseClient
          .from('medication_therapy_reviews')
          .insert({
            ...body,
            hospital_id: profile.hospital_id,
            pharmacist_id: user.id
          })
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update_medication_therapy_review': {
        const body = await req.json()
        const { id, ...updates } = body
        const { data, error } = await supabaseClient
          .from('medication_therapy_reviews')
          .update(updates)
          .eq('id', id)
          .eq('hospital_id', profile.hospital_id)
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'perform_dur_analysis': {
        const body = await req.json()
        const { patient_id } = body

        // Call the database function
        const { data, error } = await supabaseClient
          .rpc('perform_dur_analysis', { patient_uuid: patient_id })

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
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
          .eq('hospital_id', profile.hospital_id)
          .order('created_at', { ascending: false })

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'insert_dur_finding': {
        const body = await req.json()
        const { data, error } = await supabaseClient
          .from('dur_findings')
          .insert({
            ...body,
            hospital_id: profile.hospital_id
          })
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update_dur_finding': {
        const body = await req.json()
        const { id, ...updates } = body
        const { data, error } = await supabaseClient
          .from('dur_findings')
          .update(updates)
          .eq('id', id)
          .eq('hospital_id', profile.hospital_id)
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_clinical_stats': {
        // Get clinical pharmacy statistics
        const [
          { count: interventions },
          { count: reviews },
          { count: findings }
        ] = await Promise.all([
          supabaseClient
            .from('clinical_interventions')
            .select('*', { count: 'exact', head: true })
            .eq('hospital_id', profile.hospital_id),
          supabaseClient
            .from('medication_therapy_reviews')
            .select('*', { count: 'exact', head: true })
            .eq('hospital_id', profile.hospital_id),
          supabaseClient
            .from('dur_findings')
            .select('*', { count: 'exact', head: true })
            .eq('hospital_id', profile.hospital_id)
            .eq('resolution_status', 'pending')
        ])

        const stats = {
          total_interventions: interventions,
          total_reviews: reviews,
          pending_findings: findings,
          resolved_today: 0 // Would need more complex query
        }

        return new Response(JSON.stringify(stats), {
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