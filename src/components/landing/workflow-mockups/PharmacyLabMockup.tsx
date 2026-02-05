import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill, TestTube, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const prescriptions = [
  { patient: 'John Smith', meds: 3, priority: 'urgent', status: 'pending' },
  { patient: 'Anna Lee', meds: 1, priority: 'normal', status: 'pending' },
  { patient: 'Mike Brown', meds: 2, priority: 'normal', status: 'ready' },
];

const labResults = [
  { patient: 'Sarah Kim', test: 'CBC', status: 'completed', critical: false },
  { patient: 'Tom Wilson', test: 'Lipid Panel', status: 'pending', critical: false },
  { patient: 'Emma Davis', test: 'Glucose', status: 'completed', critical: true },
];

export function PharmacyLabMockup() {
  return (
    <div className="h-full flex flex-col bg-background p-3 pt-10">
      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        <Badge variant="default" className="text-[9px] px-2 py-1">
          <Pill className="w-3 h-3 mr-1" />
          Pharmacy
        </Badge>
        <Badge variant="outline" className="text-[9px] px-2 py-1">
          <TestTube className="w-3 h-3 mr-1" />
          Lab Results
        </Badge>
      </div>

      {/* Pharmacy Queue */}
      <div className="flex-1 space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium text-foreground">Prescription Queue</p>
          <Badge variant="secondary" className="text-[8px]">3 Pending</Badge>
        </div>
        
        {prescriptions.map((rx) => (
          <Card key={rx.patient} className="p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-foreground">{rx.patient}</span>
              {rx.priority === 'urgent' && (
                <Badge variant="destructive" className="text-[7px] px-1 py-0 h-3.5">
                  Urgent
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">
                <Pill className="w-2.5 h-2.5 inline mr-0.5" />
                {rx.meds} medications
              </span>
              <Button size="sm" variant={rx.status === 'ready' ? 'default' : 'outline'} className="h-5 text-[8px] px-2">
                {rx.status === 'ready' ? 'Collect' : 'Dispense'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Lab Results Preview */}
      <Card className="p-2 bg-muted/30">
        <p className="text-[10px] font-medium text-foreground mb-2">Recent Lab Results</p>
        <div className="space-y-1.5">
          {labResults.map((lab) => (
            <div key={`${lab.patient}-${lab.test}`} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {lab.status === 'completed' ? (
                  <CheckCircle2 className={`w-3 h-3 ${lab.critical ? 'text-destructive' : 'text-success'}`} />
                ) : (
                  <Clock className="w-3 h-3 text-muted-foreground" />
                )}
                <span className="text-[9px] text-foreground">{lab.patient}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-muted-foreground">{lab.test}</span>
                {lab.critical && (
                  <AlertTriangle className="w-3 h-3 text-destructive" />
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Low Stock Alert */}
      <Card className="mt-2 p-2 border-warning/50 bg-warning/10">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-warning" />
          <span className="text-[9px] font-medium text-foreground">Low Stock: Amoxicillin (15 left)</span>
        </div>
      </Card>
    </div>
  );
}
