import { useState } from 'react';
import { useLabOrders } from '@/hooks/useLabOrders';
import { useCriticalValueAlerts } from '@/hooks/useCriticalValueAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TestTube2, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function EnhancedLabOrderQueue() {
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const { data: orders, isLoading } = useLabOrders(selectedStatus);
  const { alerts } = useCriticalValueAlerts();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'secondary',
      collected: 'default',
      in_progress: 'default',
      completed: 'default',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getTurnaroundTime = (createdAt: string, completedAt?: string) => {
    const start = new Date(createdAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    
    const isOverdue = !completedAt && minutes > 60;
    return (
      <span className={isOverdue ? 'text-destructive font-medium' : ''}>
        {minutes} min
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TestTube2 className="h-5 w-5" />
            Lab Order Queue
          </span>
          {alerts && alerts.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {alerts.length} Critical
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          {['pending', 'collected', 'in_progress', 'completed'].map((status) => (
            <Button
              key={status}
              variant={selectedStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus(status)}
            >
              {status}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading orders...</div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No {selectedStatus} orders</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {orders.map((order: any) => (
                <div
                  key={order.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{order.test_name}</span>
                        {getStatusBadge(order.status)}
                        {order.priority === 'urgent' && (
                          <Badge variant="destructive">Urgent</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Patient: {order.patient?.first_name} {order.patient?.last_name} (MRN: {order.patient?.mrn})
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Turnaround: {getTurnaroundTime(order.created_at, order.completed_at)}
                        </span>
                        <span>
                          Ordered {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <Button size="sm">
                      {order.status === 'pending' && 'Collect'}
                      {order.status === 'collected' && 'Process'}
                      {order.status === 'in_progress' && 'Enter Results'}
                      {order.status === 'completed' && 'View'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
