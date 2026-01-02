import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Clock, CheckCircle2, Phone } from 'lucide-react';

const queueItems = [
  { token: 'Q-001', name: 'Aisha Patel', status: 'In Consultation', time: '2 min', statusColor: 'bg-primary' },
  { token: 'Q-002', name: 'Raj Kumar', status: 'Called', time: '5 min', statusColor: 'bg-warning' },
  { token: 'Q-003', name: 'Maria Santos', status: 'Waiting', time: '12 min', statusColor: 'bg-muted' },
  { token: 'Q-004', name: 'John Chen', status: 'Waiting', time: '18 min', statusColor: 'bg-muted' },
];

export function OutpatientMockup() {
  return (
    <div className="h-full flex flex-col bg-background p-3 pt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Patient Queue</h3>
          <p className="text-[10px] text-muted-foreground">Dr. Sarah Johnson - Room 102</p>
        </div>
        <Button size="sm" className="h-6 text-[10px] px-2">
          <Phone className="w-3 h-3 mr-1" />
          Call Next
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Card className="p-2 text-center">
          <p className="text-lg font-bold text-primary">12</p>
          <p className="text-[9px] text-muted-foreground">Waiting</p>
        </Card>
        <Card className="p-2 text-center">
          <p className="text-lg font-bold text-warning">3</p>
          <p className="text-[9px] text-muted-foreground">In Progress</p>
        </Card>
        <Card className="p-2 text-center">
          <p className="text-lg font-bold text-success">45</p>
          <p className="text-[9px] text-muted-foreground">Completed</p>
        </Card>
      </div>

      {/* Queue List */}
      <div className="flex-1 space-y-2 overflow-hidden">
        {queueItems.map((item) => (
          <Card key={item.token} className="p-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-foreground">{item.token}</span>
                <span className="text-[10px] text-foreground truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={`text-[8px] px-1 py-0 h-4 ${item.statusColor} text-white border-0`}>
                  {item.status}
                </Badge>
                <span className="text-[9px] text-muted-foreground flex items-center">
                  <Clock className="w-2.5 h-2.5 mr-0.5" />
                  {item.time}
                </span>
              </div>
            </div>
            {item.status === 'In Consultation' && (
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
