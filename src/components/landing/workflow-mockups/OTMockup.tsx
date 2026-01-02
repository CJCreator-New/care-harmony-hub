import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Scissors, Clock, User, CheckSquare } from 'lucide-react';

const schedule = [
  { time: '8:00 AM', procedure: 'Appendectomy', surgeon: 'Dr. Khan', or: 'OR-1', status: 'completed' },
  { time: '10:30 AM', procedure: 'Knee Replacement', surgeon: 'Dr. Miller', or: 'OR-2', status: 'in-progress' },
  { time: '2:00 PM', procedure: 'Cardiac Bypass', surgeon: 'Dr. Chen', or: 'OR-1', status: 'scheduled' },
  { time: '4:30 PM', procedure: 'Hip Surgery', surgeon: 'Dr. Patel', or: 'OR-3', status: 'scheduled' },
];

const statusStyles = {
  completed: 'border-l-success',
  'in-progress': 'border-l-warning',
  scheduled: 'border-l-muted',
};

const statusBadges = {
  completed: { text: 'Done', color: 'bg-success' },
  'in-progress': { text: 'In OR', color: 'bg-warning' },
  scheduled: { text: 'Scheduled', color: 'bg-muted' },
};

export function OTMockup() {
  return (
    <div className="h-full flex flex-col bg-background p-3 pt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">OT Schedule</h3>
          <p className="text-[10px] text-muted-foreground">Today, Dec 28, 2024</p>
        </div>
        <Badge variant="secondary" className="text-[9px]">
          4 Procedures
        </Badge>
      </div>

      {/* OR Status */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <Card className="p-1.5 text-center border-warning/50 bg-warning/10">
          <p className="text-[10px] font-bold text-foreground">OR-1</p>
          <p className="text-[8px] text-warning">In Use</p>
        </Card>
        <Card className="p-1.5 text-center border-warning/50 bg-warning/10">
          <p className="text-[10px] font-bold text-foreground">OR-2</p>
          <p className="text-[8px] text-warning">In Use</p>
        </Card>
        <Card className="p-1.5 text-center border-success/50 bg-success/10">
          <p className="text-[10px] font-bold text-foreground">OR-3</p>
          <p className="text-[8px] text-success">Available</p>
        </Card>
      </div>

      {/* Schedule List */}
      <div className="flex-1 space-y-2 overflow-hidden">
        {schedule.map((item, index) => (
          <Card 
            key={index} 
            className={`p-2 border-l-2 ${statusStyles[item.status as keyof typeof statusStyles]}`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-bold text-foreground">{item.time}</span>
              </div>
              <Badge 
                variant="outline" 
                className={`text-[7px] px-1 py-0 h-3.5 ${statusBadges[item.status as keyof typeof statusBadges].color} text-white border-0`}
              >
                {statusBadges[item.status as keyof typeof statusBadges].text}
              </Badge>
            </div>
            <div className="flex items-center gap-1 mb-0.5">
              <Scissors className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-medium text-foreground">{item.procedure}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <User className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground">{item.surgeon}</span>
              </div>
              <span className="text-[9px] text-muted-foreground">{item.or}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Pre-Op Checklist Preview */}
      <Card className="mt-2 p-2 bg-muted/30">
        <p className="text-[9px] font-medium text-foreground mb-1">Pre-Op Checklist (Knee Replacement)</p>
        <div className="flex gap-3">
          <span className="text-[8px] text-success flex items-center">
            <CheckSquare className="w-2.5 h-2.5 mr-0.5" /> Consent
          </span>
          <span className="text-[8px] text-success flex items-center">
            <CheckSquare className="w-2.5 h-2.5 mr-0.5" /> Labs
          </span>
          <span className="text-[8px] text-muted-foreground flex items-center">
            <CheckSquare className="w-2.5 h-2.5 mr-0.5" /> Anesthesia
          </span>
        </div>
      </Card>
    </div>
  );
}
