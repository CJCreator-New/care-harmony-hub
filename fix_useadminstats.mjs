import fs from 'fs';

const filePath = 'src/hooks/useAdminStats.ts';
let content = fs.readFileSync(filePath, 'utf-8');

const targetString = `      // Transform the JSONB result to match AdminStats interface`;
const newLogic = `
      // Override specific stats with live queries to fix DATA-001, DATA-002, DATA-003, DATA-004 mismatches
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      try {
        const [
          { count: patientsCount },
          { data: apptsData },
          { data: queueData },
          { data: labsData },
          { count: completedConsultations }
        ] = await Promise.all([
          supabase.from('patients').select('*', { count: 'exact', head: true }).eq('hospital_id', hospital.id),
          supabase.from('appointments').select('id, status').eq('hospital_id', hospital.id).eq('scheduled_date', today),
          supabase.from('patient_queue').select('status').eq('hospital_id', hospital.id),
          supabase.from('lab_orders').select('status, is_critical').eq('hospital_id', hospital.id),
          supabase.from('consultations').select('id', { count: 'exact', head: true }).eq('hospital_id', hospital.id).gte('updated_at', today + 'T00:00:00Z').eq('status', 'completed')
        ]);

        if (patientsCount !== null) stats.totalPatients = patientsCount;
        if (apptsData) {
          stats.todayAppointments = apptsData.length;
          stats.completedToday = apptsData.filter((a: any) => a.status === 'completed').length;
          stats.cancelledToday = apptsData.filter((a: any) => a.status === 'cancelled').length;
        }
        if (queueData) {
          const w = queueData.filter((q: any) => q.status === 'waiting' || q.status === 'called');
          const i = queueData.filter((q: any) => q.status === 'in_service');
          stats.queueWaiting = w.length;
          stats.queueInService = i.length;
          (stats as any).queueReadyForDoctor = w.length; // Approximate mapping for nurse dashboard
        }
        if (labsData) {
          stats.pendingLabOrders = labsData.filter((l: any) => l.status === 'pending').length;
          stats.criticalLabOrders = labsData.filter((l: any) => l.status === 'pending' && l.is_critical).length;
        }
      } catch (e) {
        console.error('Error fetching live overrides:', e);
      }

      // Transform the JSONB result to match AdminStats interface`;

content = content.replace(targetString, newLogic);
fs.writeFileSync(filePath, content);
console.log('Fixed useAdminStats!');
