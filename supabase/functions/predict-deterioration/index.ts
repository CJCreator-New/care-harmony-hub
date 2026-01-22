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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { patient_id, hospital_id } = await req.json()

    if (!patient_id) throw new Error('patient_id is required')

    // 1. Fetch latest 5 readings for trend analysis
    const { data: vitals, error: vitalsError } = await supabaseClient
      .from('vital_signs')
      .select('*')
      .eq('patient_id', patient_id)
      .order('recorded_at', { ascending: false })
      .limit(5)

    if (vitalsError) throw vitalsError
    if (!vitals || vitals.length === 0) {
      return new Response(JSON.stringify({ risk: 'unknown', reason: 'No vitals recorded' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const latest = vitals[0]
    
    // 2. Calculate MEWS (Modified Early Warning Score) - Simplified
    let mews = 0
    
    // Heart Rate
    if (latest.heart_rate < 40 || latest.heart_rate > 130) mews += 3
    else if (latest.heart_rate > 110) mews += 2
    else if (latest.heart_rate < 50 || latest.heart_rate > 100) mews += 1
    
    // Systolic BP
    if (latest.blood_pressure_systolic < 70) mews += 3
    else if (latest.blood_pressure_systolic < 80 || latest.blood_pressure_systolic > 200) mews += 2
    else if (latest.blood_pressure_systolic < 100) mews += 1
    
    // Respiratory Rate
    if (latest.respiratory_rate < 8 || latest.respiratory_rate > 30) mews += 3
    else if (latest.respiratory_rate > 25) mews += 2
    else if (latest.respiratory_rate > 20) mews += 1
    
    // Temperature
    if (latest.temperature < 35 || latest.temperature > 38.5) mews += 2
    
    // 3. Trend Analysis
    let trend = 'stable'
    if (vitals.length >= 2) {
      const prev = vitals[1]
      if (latest.heart_rate > prev.heart_rate * 1.2 && latest.blood_pressure_systolic < prev.blood_pressure_systolic * 0.9) {
        trend = 'deteriorating'
        mews += 2 // Bonus points for negative trend
      }
    }

    // 4. Determination
    let risk_level = 'low'
    if (mews >= 5) risk_level = 'critical'
    else if (mews >= 3) risk_level = 'moderate'

    const result = {
      score: mews,
      level: risk_level,
      trend: trend,
      timestamp: new Date().toISOString(),
      recommendation: risk_level === 'critical' ? 'IMMEDIATE MEDICAL REVIEW REQUIRED' : 
                     risk_level === 'moderate' ? 'Increase frequency of observation' : 'Continue routine care'
    }

    // 5. Auto-log if critical
    if (risk_level === 'critical' && hospital_id) {
      await supabaseClient.from('critical_value_alerts').insert({
        hospital_id,
        patient_id,
        alert_type: 'deterioration_warning',
        severity: 'high',
        message: `Patient showing signs of clinical deterioration (MEWS: ${mews}). Trend: ${trend}.`,
        metadata: result
      })
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Deterioration prediction error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
