import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LowStockMedication {
  id: string;
  name: string;
  generic_name: string | null;
  current_stock: number;
  minimum_stock: number;
  hospital_id: string;
  hospital_name?: string;
  hospital_email?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for low stock medications...');

    // Get all active medications that are below minimum stock
    const { data: medications, error: medError } = await supabase
      .from('medications')
      .select(`
        id,
        name,
        generic_name,
        current_stock,
        minimum_stock,
        hospital_id,
        manufacturer
      `)
      .eq('is_active', true)
      .lt('current_stock', supabase.rpc as any);

    if (medError) {
      console.error('Error fetching medications:', medError);
      throw medError;
    }

    // Filter for medications below minimum stock
    const lowStockMeds = (medications || []).filter(
      (m: any) => m.current_stock < m.minimum_stock
    );

    console.log(`Found ${lowStockMeds.length} low stock medications`);

    if (lowStockMeds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No low stock medications found',
          lowStockCount: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group by hospital
    const byHospital: Record<string, LowStockMedication[]> = {};
    for (const med of lowStockMeds) {
      if (!byHospital[med.hospital_id]) {
        byHospital[med.hospital_id] = [];
      }
      byHospital[med.hospital_id].push(med);
    }

    // Get hospital details
    const hospitalIds = Object.keys(byHospital);
    const { data: hospitals, error: hospError } = await supabase
      .from('hospitals')
      .select('id, name, email')
      .in('id', hospitalIds);

    if (hospError) {
      console.error('Error fetching hospitals:', hospError);
      throw hospError;
    }

    // Create notifications for pharmacists and admins in each hospital
    const notifications: Array<{
      hospital_id: string;
      recipient_id: string;
      type: string;
      title: string;
      message: string;
      priority: string;
      category: string;
      action_url: string;
      metadata: Record<string, any>;
    }> = [];
    
    const reorderReports: Array<{
      hospital_id: string;
      hospital_name: string;
      hospital_email: string;
      generated_at: string;
      summary: {
        total_low_stock: number;
        out_of_stock: number;
        critically_low: number;
        low: number;
      };
      medications: Array<{
        id: string;
        name: string;
        generic_name: string | null;
        current_stock: number;
        minimum_stock: number;
        reorder_quantity: number;
        status: string;
      }>;
    }> = [];

    for (const hospital of hospitals || []) {
      const hospitalMeds = byHospital[hospital.id];
      
      // Create a summary for this hospital
      const outOfStock = hospitalMeds.filter(m => m.current_stock === 0);
      const criticallyLow = hospitalMeds.filter(m => m.current_stock > 0 && m.current_stock <= m.minimum_stock * 0.5);
      const low = hospitalMeds.filter(m => m.current_stock > m.minimum_stock * 0.5 && m.current_stock < m.minimum_stock);

      const report = {
        hospital_id: hospital.id,
        hospital_name: hospital.name,
        hospital_email: hospital.email,
        generated_at: new Date().toISOString(),
        summary: {
          total_low_stock: hospitalMeds.length,
          out_of_stock: outOfStock.length,
          critically_low: criticallyLow.length,
          low: low.length,
        },
        medications: hospitalMeds.map(m => ({
          id: m.id,
          name: m.name,
          generic_name: m.generic_name,
          current_stock: m.current_stock,
          minimum_stock: m.minimum_stock,
          reorder_quantity: Math.max(m.minimum_stock * 2 - m.current_stock, m.minimum_stock),
          status: m.current_stock === 0 ? 'out_of_stock' : 
                  m.current_stock <= m.minimum_stock * 0.5 ? 'critical' : 'low',
        })),
      };

      reorderReports.push(report);

      // Get pharmacists and admins for this hospital to notify
      const { data: staffRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('hospital_id', hospital.id)
        .in('role', ['pharmacist', 'admin']);

      if (staffRoles && staffRoles.length > 0) {
        const urgentMeds = outOfStock.length + criticallyLow.length;
        const priority = urgentMeds > 0 ? 'high' : 'normal';
        
        for (const staff of staffRoles) {
          notifications.push({
            hospital_id: hospital.id,
            recipient_id: staff.user_id,
            type: 'low_stock_alert',
            title: `Low Stock Alert: ${hospitalMeds.length} medications need reordering`,
            message: `${outOfStock.length} out of stock, ${criticallyLow.length} critically low, ${low.length} below minimum. Review inventory immediately.`,
            priority,
            category: 'inventory',
            action_url: '/inventory',
            metadata: {
              report_id: `reorder-${hospital.id}-${Date.now()}`,
              summary: report.summary,
            },
          });
        }
      }
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
      } else {
        console.log(`Created ${notifications.length} notifications`);
      }
    }

    console.log('Low stock check completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Low stock check completed',
        lowStockCount: lowStockMeds.length,
        hospitalsNotified: reorderReports.length,
        notificationsCreated: notifications.length,
        reports: reorderReports,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in check-low-stock function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
