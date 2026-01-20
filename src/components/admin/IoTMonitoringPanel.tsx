import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Activity } from 'lucide-react';
import { iotIntegration } from '@/services/iotIntegration';

export const IoTMonitoringPanel = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const inv = await iotIntegration.monitorInventory('item-1');
    setInventory(inv);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            IoT Device Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Wifi className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-sm">Vital Monitor - Room 101</p>
                  <p className="text-xs text-muted-foreground">Last reading: 2 min ago</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50">Online</Badge>
            </div>

            {inventory && (
              <div className="p-3 border rounded-lg">
                <p className="font-medium text-sm mb-2">Smart Inventory</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Current Level</span>
                  <span className="font-bold">{inventory.currentLevel} units</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${(inventory.currentLevel / 100) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
