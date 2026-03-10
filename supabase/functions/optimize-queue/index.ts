import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { authorize } from '../_shared/authorize.ts'
import { validateRequest } from '../_shared/validation.ts'
import { withRateLimit } from '../_shared/rateLimit.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const queueSchema = z.object({
  hospital_id: z.string().uuid(),
});

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const authError = await authorize(req, ['admin', 'receptionist', 'nurse', 'doctor', 'super_admin'])
  if (authError) return authError

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const validation = await validateRequest(req, queueSchema);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { hospital_id } = validation.data;

    // 1. Fetch current waiting queue with patient and appointment info
    const { data: queue, error: queueError } = await supabaseClient
      .from('patient_queue')
      .select('*, patient:patients(*), appointment:appointments(*)')
      .eq('hospital_id', hospital_id)
      .eq('status', 'waiting')
      .order('check_in_time', { ascending: true })

    if (queueError) throw queueError

    if (!queue || queue.length === 0) {
      return new Response(JSON.stringify({ message: 'Queue is empty', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Define Weights
    const weights = {
      priority: {
        emergency: 1000,
        urgent: 500,
        normal: 100,
        routine: 50
      },
      waitTime: 0.5, // points per minute waiting
      appointmentDelay: 2.0 // points per minute past appointment time
    }

    // 3. Calculate Scores
    const now = new Date()
    const optimizedQueue = queue.map((entry: any) => {
      let score = 0
      
      // Base Priority Score
      score += weights.priority[entry.priority as keyof typeof weights.priority] || 0
      
      // Wait Time Score
      const waitMinutes = (now.getTime() - new Date(entry.check_in_time).getTime()) / (60 * 1000)
      score += waitMinutes * weights.waitTime
      
      // Appointment Delay Score
      if (entry.appointment?.start_time) {
        const appointmentTime = new Date(entry.appointment.start_time)
        if (now > appointmentTime) {
          const delayMinutes = (now.getTime() - appointmentTime.getTime()) / (60 * 1000)
          score += delayMinutes * weights.appointmentDelay
        }
      }

      // Add small random factor to prevent exact ties
      score += Math.random()

      return {
        id: entry.id,
        score: Math.round(score * 100) / 100,
        reason: `Priority: ${entry.priority}, Wait: ${Math.round(waitMinutes)}m`
      }
    })

    // 4. Batch Update Scores in Database
    for (const item of optimizedQueue) {
      await supabaseClient
        .from('patient_queue')
        .update({ 
          priority_score: item.score,
          ai_recommendation: { 
            optimized_at: now.toISOString(),
            score_components: item.reason 
          }
        })
        .eq('id', item.id)
    }

    // 5. Log Execution
    await supabaseClient.from('workflow_execution_logs').insert({
      hospital_id,
      trigger_event: 'queue_optimization_manual',
      actions_executed: { 
        action: 'batch_score_update', 
        updated_records: optimizedQueue.length 
      },
      status: 'success'
    })

    return new Response(JSON.stringify({ 
      success: true, 
      count: optimizedQueue.length,
      optimized_ids: optimizedQueue.map(q => q.id)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Queue optimization error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

serve((req) => withRateLimit(req, handler));

