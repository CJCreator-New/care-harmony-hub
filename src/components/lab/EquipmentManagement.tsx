import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Tool, 
  Thermometer, 
  BarChart3,
  Calendar,
  Wrench,
  Clock
} from 'lucide-react';
import { usePredictiveMaintenance, LabEquipment } from '@/hooks/usePredictiveMaintenance';
import { format } from 'date-fns';

export function EquipmentManagement() {
  const { data: equipmentList, isLoading } = usePredictiveMaintenance() as { data: LabEquipment[], isLoading: boolean };
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedEquipment = equipmentList?.find(e => e.id === selectedId);

  if (isLoading) {
     return <div className="flex items-center justify-center p-8">Loading equipment status...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Equipment Management</h2>
          <p className="text-muted-foreground">Real-time monitoring and predictive maintenance for lab analyzers.</p>
        </div>
        <Button className="gap-2">
          <Wrench className="h-4 w-4" /> Schedule Maintenance
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {equipmentList?.map((eq) => (
          <Card 
            key={eq.id} 
            className={`cursor-pointer transition-all hover:border-primary ${selectedId === eq.id ? 'border-primary ring-1 ring-primary' : ''}`}
            onClick={() => setSelectedId(eq.id)}
          >
            <CardHeader className="pb-2 space-y-0">
               <div className="flex justify-between items-start">
                 <Badge 
                  variant={eq.status === 'online' ? 'default' : eq.status === 'maintenance' ? 'secondary' : 'destructive'}
                  className="mb-2"
                >
                   {eq.status}
                 </Badge>
                 {eq.predictedFailureProbability > 20 && (
                   <div className="text-orange-500 animate-pulse">
                     <AlertTriangle className="h-4 w-4" />
                   </div>
                 )}
               </div>
               <CardTitle className="text-base line-clamp-1" title={eq.name}>{eq.name}</CardTitle>
               <CardDescription className="text-xs">{eq.model}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Health Score</span>
                    <span className={`font-medium ${eq.healthScore > 80 ? 'text-green-500' : eq.healthScore > 50 ? 'text-orange-500' : 'text-red-500'}`}>
                      {eq.healthScore}%
                    </span>
                  </div>
                  <Progress value={eq.healthScore} className="h-1.5" />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/30 p-2 rounded flex flex-col items-center justify-center text-center">
                    <Activity className="h-3 w-3 mb-1 text-blue-500" />
                    <span className="text-muted-foreground">Utilization</span>
                    <span className="font-semibold">{eq.utilizationRate}%</span>
                  </div>
                  <div className="bg-muted/30 p-2 rounded flex flex-col items-center justify-center text-center">
                    <Clock className="h-3 w-3 mb-1 text-indigo-500" />
                    <span className="text-muted-foreground">Maintenance</span>
                    <span className="font-semibold">{format(new Date(eq.nextMaintenanceDue), 'MMM dd')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedEquipment && (
         <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           <CardHeader>
             <div className="flex items-center gap-2">
               <Activity className="h-5 w-5 text-primary" />
               <CardTitle>Detailed Diagnostics: {selectedEquipment.name}</CardTitle>
             </div>
           </CardHeader>
           <CardContent>
             <Tabs defaultValue="health" className="w-full">
               <TabsList>
                 <TabsTrigger value="health">System Health</TabsTrigger>
                 <TabsTrigger value="maintenance">Maintenance Schedule</TabsTrigger>
                 <TabsTrigger value="history">Error Logs</TabsTrigger>
               </TabsList>
               
               <TabsContent value="health" className="space-y-4 pt-4">
                 <div className="grid md:grid-cols-3 gap-4">
                   <div className="p-4 border rounded-lg bg-card space-y-2">
                     <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                       <Thermometer className="h-4 w-4" /> Operating Temp
                     </span>
                     <div className="text-2xl font-bold">{selectedEquipment.temperature}°C</div>
                     <p className="text-xs text-green-500">Normal Range (20-25°C)</p>
                   </div>
                   
                   <div className="p-4 border rounded-lg bg-card space-y-2">
                     <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                       <CheckCircle2 className="h-4 w-4" /> QC Status
                     </span>
                     <div className="text-2xl font-bold capitalize">{selectedEquipment.qcStatus}</div>
                     <p className="text-xs text-muted-foreground">Last run: Today 08:00 AM</p>
                   </div>

                   <div className="p-4 border rounded-lg bg-card space-y-2">
                     <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                       <BarChart3 className="h-4 w-4" /> Calibration
                     </span>
                     <div className="text-2xl font-bold">Valid</div>
                     <p className="text-xs text-muted-foreground">Expires in 15 days</p>
                   </div>
                 </div>

                 <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
                    <h4 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4" /> 
                      Failure Prediction Model
                    </h4>
                    <p className="text-sm text-red-600 dark:text-red-300">
                      AI analysis indicates a <strong>{selectedEquipment.predictedFailureProbability}% probability</strong> of mechanical failure in the loading arm within the next 48 hours. Recommended action: Inspect belt drive tension.
                    </p>
                 </div>
               </TabsContent>

               <TabsContent value="history" className="pt-4">
                 {selectedEquipment.errorLog.length > 0 ? (
                   <div className="space-y-2">
                     {selectedEquipment.errorLog.map(err => (
                       <div key={err.id} className="flex justify-between items-center p-3 border-b last:border-0">
                         <div className="flex items-center gap-3">
                           <Badge variant={err.severity === 'high' ? 'destructive' : 'secondary'}>
                             {err.code}
                           </Badge>
                           <span className="font-medium text-sm">{err.message}</span>
                         </div>
                         <span className="text-xs text-muted-foreground">{new Date(err.timestamp).toLocaleString()}</span>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="text-center py-8 text-muted-foreground">
                     No recent errors logged.
                   </div>
                 )}
               </TabsContent>
               <TabsContent value="maintenance" className="pt-4">
                  <div className="p-4 border rounded bg-muted/20 text-center">
                    <p>Next scheduled maintenance: <strong>{new Date(selectedEquipment.nextMaintenanceDue).toLocaleDateString()}</strong></p>
                    <div className="mt-4 flex gap-4 justify-center">
                       <Button variant="outline">View Checklist</Button>
                       <Button>Reschedule</Button>
                    </div>
                  </div>
               </TabsContent>
             </Tabs>
           </CardContent>
         </Card>
      )}
    </div>
  );
}
