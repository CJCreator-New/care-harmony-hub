import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PrescriptionQueue } from './PrescriptionQueue';
import { ClinicalServices } from './ClinicalServices';
import { RefillRequests } from './RefillRequests';
import { InventoryDashboard } from './InventoryDashboard';
import { usePrescriptionStats } from '@/hooks/usePrescriptions';
import { 
  Pill, 
  Settings, 
  ClipboardList, 
  BarChart3, 
  Zap, 
  AlertCircle,
  Activity,
  Package,
  Clock,
  CheckCircle2,
  RefreshCcw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function PharmacistDashboard() {
  const [activeTab, setActiveTab] = useState('queue');
  const { data: stats, isLoading: statsLoading } = usePrescriptionStats();

  const metrics = [
    {
      title: 'Pending Prescriptions',
      value: stats?.pending || 0,
      icon: <Clock className="h-4 w-4 text-yellow-500" />,
      description: 'Waiting for dispensing',
      trend: '+2 from last hour',
    },
    {
      title: 'Dispensed Today',
      value: stats?.dispensed || 0,
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      description: 'Completed orders',
      trend: '94% pharmacy efficiency',
    },
    {
      title: 'Active Consultations',
      value: 8, // Mocked
      icon: <Zap className="h-4 w-4 text-blue-500" />,
      description: 'Requiring pharmacy review',
      trend: 'Avg response: 4m',
    },
    {
      title: 'Inventory Alerts',
      value: 12, // Mocked
      icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      description: 'Items below threshold',
      trend: '3 critical stockouts',
    },
  ];

  return (
    <div className="space-y-6 container mx-auto px-4 py-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pharmacist Command Center</h1>
          <p className="text-muted-foreground">Manage prescriptions, inventory, and clinical pharmacy services.</p>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                  <p className="text-2xl font-bold">{statsLoading ? <Skeleton className="h-8 w-16" /> : metric.value}</p>
                </div>
                <div className="p-2 bg-muted rounded-full">
                  {metric.icon}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{metric.description}</span>
                <span className="text-green-600 font-medium">{metric.trend}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="queue" className="flex gap-2">
            <ClipboardList className="h-4 w-4" />
            Prescription Queue
            {(stats?.pending || 0) > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                {stats?.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="refills" className="flex gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refill Requests
          </TabsTrigger>
          <TabsTrigger value="clinical" className="flex gap-2">
            <Activity className="h-4 w-4" />
            Clinical Services
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex gap-2">
            <Package className="h-4 w-4" />
            Inventory & Stock
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex gap-2">
            <BarChart3 className="h-4 w-4" />
            Pharmacy Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <PrescriptionQueue />
        </TabsContent>

        <TabsContent value="refills" className="space-y-4">
          <RefillRequests />
        </TabsContent>

        <TabsContent value="clinical" className="space-y-4">
          <ClinicalServices />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <InventoryDashboard />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pharmacy Analytics</CardTitle>
              <CardDescription>Performance metrics and medication utilization trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Generating real-time usage reports...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { Clock, CheckCircle2 } from 'lucide-react';
