import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Bed, User, Calendar, AlertCircle } from 'lucide-react';

const beds = [
  { room: '101-A', patient: 'James Wilson', days: 3, status: 'occupied' },
  { room: '101-B', patient: null, days: 0, status: 'available' },
  { room: '102-A', patient: 'Emily Brown', days: 1, status: 'occupied' },
  { room: '102-B', patient: 'Michael Lee', days: 5, status: 'critical' },
  { room: '103-A', patient: null, days: 0, status: 'reserved' },
  { room: '103-B', patient: 'Sarah Davis', days: 2, status: 'occupied' },
];

const statusStyles = {
  occupied: 'bg-primary/20 border-primary/30',
  available: 'bg-success/20 border-success/30',
  reserved: 'bg-warning/20 border-warning/30',
  critical: 'bg-destructive/20 border-destructive/30',
};

const statusLabels = {
  occupied: { text: 'Occupied', color: 'bg-primary' },
  available: { text: 'Available', color: 'bg-success' },
  reserved: { text: 'Reserved', color: 'bg-warning' },
  critical: { text: 'Critical', color: 'bg-destructive' },
};

export function InpatientMockup() {
  return (
    <div className="h-full flex flex-col bg-background p-3 pt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Ward A - General</h3>
          <p className="text-[10px] text-muted-foreground">Floor 2 · 6 Beds</p>
        </div>
        <div className="flex gap-1">
          <Badge variant="outline" className="text-[9px] px-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success mr-1" />
            2 Available
          </Badge>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        <Card className="p-1.5 text-center">
          <p className="text-sm font-bold text-foreground">24</p>
          <p className="text-[8px] text-muted-foreground">Occupied</p>
        </Card>
        <Card className="p-1.5 text-center">
          <p className="text-sm font-bold text-success">6</p>
          <p className="text-[8px] text-muted-foreground">Available</p>
        </Card>
        <Card className="p-1.5 text-center">
          <p className="text-sm font-bold text-warning">4</p>
          <p className="text-[8px] text-muted-foreground">Discharges</p>
        </Card>
        <Card className="p-1.5 text-center">
          <p className="text-sm font-bold text-destructive">2</p>
          <p className="text-[8px] text-muted-foreground">Critical</p>
        </Card>
      </div>

      {/* Bed Grid */}
      <div className="flex-1 grid grid-cols-2 gap-2 overflow-hidden">
        {beds.map((bed) => (
          <Card 
            key={bed.room} 
            className={`p-2 border ${statusStyles[bed.status as keyof typeof statusStyles]}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-foreground">{bed.room}</span>
              <Badge 
                variant="outline" 
                className={`text-[7px] px-1 py-0 h-3.5 ${statusLabels[bed.status as keyof typeof statusLabels].color} text-white border-0`}
              >
                {statusLabels[bed.status as keyof typeof statusLabels].text}
              </Badge>
            </div>
            {bed.patient ? (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-muted-foreground" />
                <span className="text-[9px] text-foreground truncate">{bed.patient}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Bed className="w-3 h-3 text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground">Empty</span>
              </div>
            )}
            {bed.days > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <Calendar className="w-2.5 h-2.5 text-muted-foreground" />
                <span className="text-[8px] text-muted-foreground">{bed.days} days</span>
                {bed.status === 'critical' && (
                  <AlertCircle className="w-2.5 h-2.5 text-destructive ml-auto" />
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
