import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock } from 'lucide-react';

export function QueuePositionDisplay() {
  const { data: queueStats } = useQuery({
    queryKey: ['queue-position'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('queue_entries')
        .select('status, priority, created_at')
        .in('status', ['waiting', 'in_progress']);

      if (error) throw error;

      const waiting = data.filter(e => e.status === 'waiting');
      const inProgress = data.filter(e => e.status === 'in_progress');
      const urgent = waiting.filter(e => e.priority === 'urgent').length;
      const avgWait = waiting.length > 0 
        ? waiting.reduce((acc, e) => acc + (Date.now() - new Date(e.created_at).getTime()), 0) / waiting.length / 60000
        : 0;

      return {
        waiting: waiting.length,
        inProgress: inProgress.length,
        urgent,
        avgWaitMinutes: Math.round(avgWait),
      };
    },
    refetchInterval: 10000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Queue Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{queueStats?.waiting || 0}</div>
            <div className="text-sm text-muted-foreground">Waiting</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{queueStats?.inProgress || 0}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </div>
          <div>
            <Badge variant="destructive">{queueStats?.urgent || 0} Urgent</Badge>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Clock className="h-4 w-4" />
            {queueStats?.avgWaitMinutes || 0}m avg
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
