import fs from 'fs';

const filePath = 'src/components/dashboard/RecentActivity.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

if (!content.includes('useQuery')) {
  content = content.replace("import { cn } from '@/lib/utils';", "import { cn } from '@/lib/utils';\nimport { useQuery } from '@tanstack/react-query';\nimport { supabase } from '@/integrations/supabase/client';\nimport { useAuth } from '@/contexts/AuthContext';\nimport { formatDistanceToNow } from 'date-fns';");

  const componentStart = `export function RecentActivity({ activities = [] }: RecentActivityProps) {`;
  const componentNew = `export function RecentActivity({ activities: propActivities }: RecentActivityProps) {
  const { hospital } = useAuth();
  
  const { data: fetchActivities } = useQuery({
    queryKey: ['recent-activities', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('hospital_id', hospital.id)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (!data) return [];
      
      return data.map((log: any) => ({
        id: log.id,
        title: log.action_type?.replace(/_/g, ' ') || 'Activity',
        description: typeof log.details === 'string' ? log.details : (log.details?.reason || log.details?.notes || log.entity_type || 'System action'),
        time: formatDistanceToNow(new Date(log.created_at), { addSuffix: true }),
        type: log.entity_type === 'patients' ? 'patient_registered' : 
              log.entity_type === 'consultation' ? 'consultation' : 
              log.entity_type === 'prescription' ? 'prescription' : 
              log.entity_type === 'lab_order' ? 'lab_order' : 'alert',
        status: log.severity === 'error' ? 'warning' : 'success'
      }));
    },
    enabled: !!hospital?.id && (!propActivities || propActivities.length === 0)
  });

  const activities = (propActivities && propActivities.length > 0) ? propActivities : (fetchActivities || []);
  `;
  
  content = content.replace(componentStart, componentNew);
  fs.writeFileSync(filePath, content);
  console.log('Fixed RecentActivity!');
}