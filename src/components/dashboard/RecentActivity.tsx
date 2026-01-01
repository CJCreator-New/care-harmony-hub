import { Badge } from '@/components/ui/badge';
import {
  UserPlus,
  FileText,
  Pill,
  TestTube2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'patient_registered' | 'consultation' | 'prescription' | 'lab_order' | 'payment' | 'alert';
  title: string;
  description: string;
  time: string;
  status?: 'success' | 'warning' | 'pending';
}

interface RecentActivityProps {
  activities?: ActivityItem[];
}

const activityIcons = {
  patient_registered: UserPlus,
  consultation: FileText,
  prescription: Pill,
  lab_order: TestTube2,
  payment: CreditCard,
  alert: AlertCircle,
};

const activityColors = {
  patient_registered: 'bg-primary/10 text-primary',
  consultation: 'bg-doctor/10 text-doctor',
  prescription: 'bg-pharmacy/10 text-pharmacy',
  lab_order: 'bg-info/10 text-info',
  payment: 'bg-success/10 text-success',
  alert: 'bg-warning/10 text-warning',
};

const statusIcons = {
  success: CheckCircle2,
  warning: AlertCircle,
  pending: Clock,
};

export function RecentActivity({ activities = [] }: RecentActivityProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">Latest updates across the system</p>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground font-medium">No recent activity</p>
          <p className="text-sm text-muted-foreground/70">Activity will appear here as you use the system</p>
        </div>
      ) : (
        <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.type];
            const StatusIcon = activity.status ? statusIcons[activity.status] : null;

            return (
              <div
                key={activity.id}
                className="flex gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
                    activityColors[activity.type]
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{activity.title}</p>
                    {StatusIcon && (
                      <StatusIcon
                        className={cn(
                          'w-4 h-4 shrink-0',
                          activity.status === 'success' && 'text-success',
                          activity.status === 'warning' && 'text-warning',
                          activity.status === 'pending' && 'text-muted-foreground'
                        )}
                      />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {activity.description}
                  </p>
                </div>

                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {activity.time}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
