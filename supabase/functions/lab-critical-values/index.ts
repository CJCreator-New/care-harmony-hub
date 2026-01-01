import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Critical value thresholds for common lab tests
const CRITICAL_VALUES: Record<string, { low?: number; high?: number; unit: string }> = {
  // Hematology
  'hemoglobin': { low: 7, high: 20, unit: 'g/dL' },
  'hematocrit': { low: 20, high: 60, unit: '%' },
  'white blood cell': { low: 2, high: 30, unit: 'K/uL' },
  'wbc': { low: 2, high: 30, unit: 'K/uL' },
  'platelet': { low: 50, high: 1000, unit: 'K/uL' },
  
  // Chemistry
  'glucose': { low: 50, high: 450, unit: 'mg/dL' },
  'blood glucose': { low: 50, high: 450, unit: 'mg/dL' },
  'potassium': { low: 2.8, high: 6.2, unit: 'mEq/L' },
  'sodium': { low: 120, high: 160, unit: 'mEq/L' },
  'calcium': { low: 6.5, high: 13, unit: 'mg/dL' },
  'magnesium': { low: 1, high: 4.5, unit: 'mg/dL' },
  'creatinine': { high: 10, unit: 'mg/dL' },
  'bun': { high: 100, unit: 'mg/dL' },
  'blood urea nitrogen': { high: 100, unit: 'mg/dL' },
  'troponin': { high: 0.4, unit: 'ng/mL' },
  'cardiac troponin': { high: 0.4, unit: 'ng/mL' },
  
  // Blood gases
  'ph': { low: 7.2, high: 7.6, unit: '' },
  'pco2': { low: 20, high: 70, unit: 'mmHg' },
  'po2': { low: 40, high: undefined, unit: 'mmHg' },
  
  // Coagulation
  'inr': { high: 5, unit: '' },
  'ptt': { high: 100, unit: 'seconds' },
  'aptt': { high: 100, unit: 'seconds' },
  
  // Liver
  'bilirubin': { high: 15, unit: 'mg/dL' },
  'ammonia': { high: 80, unit: 'umol/L' },
};

function checkCriticalValue(testName: string, value: number): { isCritical: boolean; message: string } {
  const normalizedTest = testName.toLowerCase();
  
  for (const [key, thresholds] of Object.entries(CRITICAL_VALUES)) {
    if (normalizedTest.includes(key)) {
      if (thresholds.low !== undefined && value < thresholds.low) {
        return {
          isCritical: true,
          message: `CRITICAL LOW: ${testName} is ${value} ${thresholds.unit} (critical threshold: <${thresholds.low} ${thresholds.unit})`,
        };
      }
      if (thresholds.high !== undefined && value > thresholds.high) {
        return {
          isCritical: true,
          message: `CRITICAL HIGH: ${testName} is ${value} ${thresholds.unit} (critical threshold: >${thresholds.high} ${thresholds.unit})`,
        };
      }
      return { isCritical: false, message: '' };
    }
  }
  
  return { isCritical: false, message: '' };
}

interface LabOrderWithDetails {
  id: string;
  hospital_id: string;
  patient_id: string;
  ordered_by: string;
  test_name: string;
  results: Record<string, unknown> | null;
  patients: {
    first_name: string;
    last_name: string;
  };
  ordering_physician: {
    user_id: string;
    first_name: string;
    last_name: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting critical value check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body for lab order ID (if called for specific order)
    let labOrderId: string | null = null;
    try {
      const body = await req.json();
      labOrderId = body.labOrderId;
    } catch {
      // No body provided, check all recent completed orders
    }

    let query = supabase
      .from('lab_orders')
      .select(`
        id,
        hospital_id,
        patient_id,
        ordered_by,
        test_name,
        results,
        patients!inner(first_name, last_name),
        ordering_physician:profiles!lab_orders_ordered_by_fkey(user_id, first_name, last_name)
      `)
      .eq('status', 'completed')
      .eq('is_critical', false);

    if (labOrderId) {
      query = query.eq('id', labOrderId);
    } else {
      // Check orders completed in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      query = query.gte('completed_at', oneHourAgo);
    }

    const { data: labOrders, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching lab orders:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${labOrders?.length || 0} completed lab orders to check`);

    const criticalOrders: string[] = [];
    const notifications: Array<{
      hospital_id: string;
      recipient_id: string;
      type: string;
      title: string;
      message: string;
      priority: string;
      category: string;
      action_url: string;
      metadata: Record<string, unknown>;
    }> = [];

    for (const order of (labOrders as unknown as LabOrderWithDetails[]) || []) {
      if (!order.results) continue;

      const results = order.results as Record<string, unknown>;
      let hasCriticalValue = false;
      const criticalMessages: string[] = [];

      // Check each result value
      for (const [key, value] of Object.entries(results)) {
        if (typeof value === 'number') {
          const check = checkCriticalValue(key, value);
          if (check.isCritical) {
            hasCriticalValue = true;
            criticalMessages.push(check.message);
          }
        } else if (typeof value === 'object' && value !== null && 'value' in value) {
          const numValue = Number((value as { value: unknown }).value);
          if (!isNaN(numValue)) {
            const check = checkCriticalValue(key, numValue);
            if (check.isCritical) {
              hasCriticalValue = true;
              criticalMessages.push(check.message);
            }
          }
        }
      }

      // Also check the test name against the result if it's a simple number
      if (typeof results.value === 'number') {
        const check = checkCriticalValue(order.test_name, results.value);
        if (check.isCritical) {
          hasCriticalValue = true;
          criticalMessages.push(check.message);
        }
      }

      if (hasCriticalValue) {
        criticalOrders.push(order.id);
        const patientName = `${order.patients.first_name} ${order.patients.last_name}`;
        const physicianName = `Dr. ${order.ordering_physician.first_name} ${order.ordering_physician.last_name}`;

        // Create notification for ordering physician
        notifications.push({
          hospital_id: order.hospital_id,
          recipient_id: order.ordering_physician.user_id,
          type: 'alert',
          title: '🚨 CRITICAL LAB VALUE',
          message: `Critical value detected for ${patientName}: ${order.test_name}. ${criticalMessages.join('. ')}. Immediate review required.`,
          priority: 'urgent',
          category: 'clinical',
          action_url: `/laboratory?order=${order.id}`,
          metadata: {
            lab_order_id: order.id,
            patient_id: order.patient_id,
            patient_name: patientName,
            test_name: order.test_name,
            critical_values: criticalMessages,
          },
        });

        console.log(`Critical value found for order ${order.id}: ${criticalMessages.join(', ')}`);
      }
    }

    // Insert notifications
    if (notifications.length > 0) {
      for (const notification of notifications) {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert([notification]);
        
        if (insertError) {
          console.error("Error inserting notification:", insertError);
        }
      }
      console.log(`Created ${notifications.length} critical value notifications`);
    }

    // Update lab orders as critical
    if (criticalOrders.length > 0) {
      const { error: updateError } = await supabase
        .from('lab_orders')
        .update({ 
          is_critical: true, 
          critical_notified: true,
          critical_notified_at: new Date().toISOString()
        })
        .in('id', criticalOrders);

      if (updateError) {
        console.error("Error updating lab orders:", updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        criticalOrdersFound: criticalOrders.length,
        notificationsSent: notifications.length,
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in lab-critical-values function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
