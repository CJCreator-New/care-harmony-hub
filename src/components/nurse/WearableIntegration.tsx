import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Watch, 
  Activity, 
  Heart, 
  Moon, 
  Footprints, 
  RefreshCw, 
  Link2, 
  Link2Off,
  Battery,
  Smartphone
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface WearableMetric {
  type: string;
  value: string | number;
  unit: string;
  timestamp: string;
  trend: 'up' | 'down' | 'stable';
  icon: any;
  color: string;
}

interface Props {
  patientId: string;
  patientName?: string;
}

export function WearableIntegration({ patientId, patientName }: Props) {
  const [deviceStatus, setDeviceStatus] = useState<'connected' | 'disconnected' | 'syncing'>('connected');
  const [lastSync, setLastSync] = useState<string>(new Date().toISOString());

  // Simulated data - in a real app, this would come from an API/SDK
  const metrics: WearableMetric[] = [
    { type: 'Heart Rate', value: 72, unit: 'bpm', timestamp: '2 mins ago', trend: 'stable', icon: Heart, color: 'text-red-500' },
    { type: 'SpO2', value: 98, unit: '%', timestamp: '2 mins ago', trend: 'stable', icon: Activity, color: 'text-blue-500' },
    { type: 'Sleep', value: '7h 12m', unit: 'hrs', timestamp: 'Today', trend: 'up', icon: Moon, color: 'text-indigo-500' },
    { type: 'Steps', value: 4521, unit: 'steps', timestamp: 'Today', trend: 'up', icon: Footprints, color: 'text-orange-500' },
  ];

  const handleSync = () => {
    setDeviceStatus('syncing');
    // Simulate delay
    setTimeout(() => {
      setDeviceStatus('connected');
      setLastSync(new Date().toISOString());
      toast.success('Wearable device synced successfully');
    }, 2000);
  };

  const toggleConnection = () => {
    if (deviceStatus === 'connected') {
      setDeviceStatus('disconnected');
      toast.info('Device disconnected');
    } else {
      setDeviceStatus('syncing');
      setTimeout(() => {
        setDeviceStatus('connected');
        toast.success('Device connected successfully');
      }, 1500);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Watch className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Wearable Device Integration</CardTitle>
              <CardDescription>
                Real-time health data from connected devices
                {patientName && ` for ${patientName}`}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={deviceStatus === 'connected' ? 'outline' : 'secondary'} className="gap-1">
              {deviceStatus === 'connected' ? (
                <Link2 className="h-3 w-3 text-green-500" />
              ) : (
                <Link2Off className="h-3 w-3 text-muted-foreground" />
              )}
              {deviceStatus === 'connected' ? 'Connected' : deviceStatus === 'syncing' ? 'Syncing...' : 'Disconnected'}
            </Badge>
            {deviceStatus === 'connected' && (
              <Badge variant="outline" className="gap-1">
                <Battery className="h-3 w-3" /> 84%
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {deviceStatus === 'disconnected' ? (
           <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 bg-muted/20 rounded-lg border border-dashed">
             <div className="p-3 bg-muted rounded-full">
               <Watch className="h-8 w-8 text-muted-foreground" />
             </div>
             <div>
               <h3 className="font-medium">No Device Connected</h3>
               <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                 Connect a supported wearable device to monitor patient vitals remotely.
               </p>
             </div>
             <Button onClick={toggleConnection} variant="outline" className="gap-2">
               <Smartphone className="h-4 w-4" /> Connect Device
             </Button>
           </div>
        ) : (
          <div className="space-y-6">
            {/* Device Info & Controls */}
            <div className="flex justify-between items-center text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Apple Watch Series 8</span>
                <span className="text-xs">• Last synced: {new Date(lastSync).toLocaleTimeString()}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSync} 
                disabled={deviceStatus === 'syncing'}
                className="h-8 gap-2"
              >
                <RefreshCw className={`h-3 w-3 ${deviceStatus === 'syncing' ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics.map((metric, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border rounded-xl bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <metric.icon className={`h-5 w-5 ${metric.color}`} />
                    {metric.trend === 'up' && <span className="text-xs text-green-500 font-medium">↑</span>}
                    {metric.trend === 'down' && <span className="text-xs text-red-500 font-medium">↓</span>}
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {metric.unit} • {metric.type}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Detailed Views */}
            <Tabs defaultValue="activity" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="activity">Recent Activity</TabsTrigger>
                <TabsTrigger value="alerts">Device Alerts</TabsTrigger>
              </TabsList>
              
              <TabsContent value="activity" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm p-3 border-b hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Footprints className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">Morning Walk</div>
                        <div className="text-xs text-muted-foreground">08:30 AM - 09:15 AM</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">3,450 steps</div>
                      <div className="text-xs text-muted-foreground">240 kcal</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm p-3 border-b hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Moon className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div>
                        <div className="font-medium">Deep Sleep</div>
                        <div className="text-xs text-muted-foreground">Last Night</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">1h 45m</div>
                      <div className="text-xs text-muted-foreground">Normal range</div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="alerts" className="pt-4">
                <div className="flex flex-col items-center justify-center text-center py-6 text-muted-foreground">
                  <Activity className="h-8 w-8 mb-2 opacity-50" />
                  <p>No abnormal readings detected in the last 24 hours.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
