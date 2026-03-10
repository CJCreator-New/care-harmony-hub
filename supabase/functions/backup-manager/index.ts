import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, corsHeaders as defaultCorsHeaders } from "../_shared/cors.ts";
import { authorize } from "../_shared/authorize.ts";
import { withRateLimit } from "../_shared/rateLimit.ts";
import { validateRequest } from "../_shared/validation.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const backupSchema = z.object({
  action: z.string().min(1),
  data: z.any().optional(),
});

interface BackupJob {
  id: string;
  type: 'full' | 'incremental' | 'critical';
  status: 'pending' | 'running' | 'completed' | 'failed';
  tables: string[];
  size_mb: number;
  created_at: string;
}

const CRITICAL_TABLES = [
  'patients', 'consultations', 'prescriptions', 'appointments',
  'medical_records', 'billing', 'users', 'hospitals'
];

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authError = await authorize(req, ['admin', 'super_admin']);
  if (authError) return authError;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const validation = await validateRequest(req, backupSchema);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    const { action, data } = validation.data;

    switch (action) {
      case 'create_backup':
        return await createBackup(supabase, data);
      case 'restore_backup':
        return await restoreBackup(supabase, data);
      case 'list_backups':
        return await listBackups(supabase);
      case 'schedule_backup':
        return await scheduleBackup(supabase, data);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

async function createBackup(supabase: any, { type = 'full', tables = [], hospital_id }: any) {
  const backupId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  const targetTables = type === 'critical' ? CRITICAL_TABLES : 
                      tables.length > 0 ? tables : CRITICAL_TABLES;

  // Create backup job record
  const { error: jobError } = await supabase
    .from('backup_jobs')
    .insert({
      id: backupId,
      hospital_id: hospital_id ?? null,
      type,
      status: 'running',
      tables: targetTables,
      created_at: timestamp,
    });

  if (jobError) throw jobError;

  try {
    let totalSize = 0;
    const backupData: any = {};

    // Export data from each table
    for (const table of targetTables) {
      const { data, error } = await supabase
        .from(table)
        .select('*');

      if (error) {
        console.warn(`Failed to backup table ${table}:`, error);
        continue;
      }

      backupData[table] = data;
      totalSize += JSON.stringify(data).length;
    }

    // Store backup in storage bucket
    const backupContent = JSON.stringify({
      metadata: {
        id: backupId,
        type,
        timestamp,
        tables: targetTables,
        version: '1.0',
      },
      data: backupData,
    });

    const { error: storageError } = await supabase.storage
      .from('backups')
      .upload(`${timestamp.split('T')[0]}/${backupId}.json`, backupContent);

    if (storageError) throw storageError;

    // Update job status
    await supabase
      .from('backup_jobs')
      .update({
        status: 'completed',
        size_mb: Math.round(totalSize / 1024 / 1024),
      })
      .eq('id', backupId);

    return new Response(
      JSON.stringify({
        success: true,
        backup_id: backupId,
        size_mb: Math.round(totalSize / 1024 / 1024),
        tables_backed_up: targetTables.length,
      }),
      { headers: { "Content-Type": "application/json", ...defaultCorsHeaders } }
    );

  } catch (error) {
    // Mark job as failed
    await supabase
      .from('backup_jobs')
      .update({ status: 'failed' })
      .eq('id', backupId);
    
    throw error;
  }
}

async function restoreBackup(supabase: any, { backup_id }: any) {
  // Get backup file from storage
  const { data: backupFile, error: downloadError } = await supabase.storage
    .from('backups')
    .download(`${backup_id}.json`);

  if (downloadError) throw downloadError;

  const backupContent = JSON.parse(await backupFile.text());
  const { data: backupData } = backupContent;

  let restoredTables = 0;

  // Restore each table
  for (const [tableName, tableData] of Object.entries(backupData)) {
    try {
      // Clear existing data (be careful in production!)
      await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Insert backup data
      if (Array.isArray(tableData) && tableData.length > 0) {
        const { error } = await supabase.from(tableName).insert(tableData);
        if (error) throw error;
        restoredTables++;
      }
    } catch (error) {
      console.warn(`Failed to restore table ${tableName}:`, error);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      backup_id,
      tables_restored: restoredTables,
    }),
    { headers: { "Content-Type": "application/json", ...defaultCorsHeaders } }
  );
}

async function listBackups(supabase: any) {
  const { data, error } = await supabase
    .from('backup_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return new Response(
    JSON.stringify({ backups: data }),
    { headers: { "Content-Type": "application/json", ...defaultCorsHeaders } }
  );
}

async function scheduleBackup(supabase: any, { schedule_type, frequency }: any) {
  const { error } = await supabase
    .from('backup_schedules')
    .insert({
      type: schedule_type,
      frequency,
      enabled: true,
      next_run: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, message: 'Backup scheduled successfully' }),
    { headers: { "Content-Type": "application/json", ...defaultCorsHeaders } }
  );
}

serve((req) => withRateLimit(req, handler));
