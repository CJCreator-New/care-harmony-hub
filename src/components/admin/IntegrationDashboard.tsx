import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFHIRIntegration } from '@/hooks/useFHIRIntegration';
import { 
  Share2, Download, Upload, CheckCircle, 
  AlertCircle, Clock, ExternalLink 
} from 'lucide-react';
import { useState } from 'react';

export function IntegrationDashboard() {
  const { exportPatient, importPatient, exportEncounter, isExporting } = useFHIRIntegration();
  const [selectedPatient, setSelectedPatient] = useState<string>('');

  const integrations = [
    {
      name: 'FHIR R4',
      status: 'connected',
      type: 'Healthcare Data Exchange',
      lastSync: '2024-12-20 14:30',
      records: 1250,
    },
    {
      name: 'Insurance Claims',
      status: 'connected',
      type: 'Claims Processing',
      lastSync: '2024-12-20 15:45',
      records: 89,
    },
    {
      name: 'Lab Equipment',
      status: 'pending',
      type: 'Device Integration',
      lastSync: 'Never',
      records: 0,
    },
    {
      name: 'Pharmacy Network',
      status: 'error',
      type: 'Prescription Management',
      lastSync: '2024-12-19 09:15',
      records: 456,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Integration Hub</h2>
        <Button>
          <ExternalLink className="h-4 w-4 mr-2" />
          Add Integration
        </Button>
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {integrations.map((integration, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{integration.name}</CardTitle>
              {getStatusIcon(integration.status)}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge className={getStatusColor(integration.status)}>
                  {integration.status}
                </Badge>
                <p className="text-xs text-muted-foreground">{integration.type}</p>
                <p className="text-xs text-muted-foreground">
                  {integration.records} records synced
                </p>
                <p className="text-xs text-muted-foreground">
                  Last sync: {integration.lastSync}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FHIR Integration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>FHIR Data Exchange</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Patient ID</label>
              <input
                type="text"
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                placeholder="Enter patient ID"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                onClick={() => selectedPatient && exportPatient(selectedPatient)}
                disabled={!selectedPatient || isExporting}
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Patient
              </Button>
              <Button
                onClick={() => selectedPatient && exportEncounter(selectedPatient)}
                disabled={!selectedPatient}
                variant="outline"
                size="sm"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Export Encounter
              </Button>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Import FHIR Data</h4>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import Patient Data
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insurance Claims</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">89</div>
                <div className="text-sm text-muted-foreground">Approved Claims</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">12</div>
                <div className="text-sm text-muted-foreground">Pending Claims</div>
              </div>
            </div>

            <div className="space-y-2">
              <Button className="w-full" size="sm">
                Verify Eligibility
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                Submit New Claim
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                Check Claim Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Integration Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { action: 'FHIR Patient Export', time: '2 minutes ago', status: 'success' },
              { action: 'Insurance Claim Submitted', time: '15 minutes ago', status: 'success' },
              { action: 'Lab Result Import', time: '1 hour ago', status: 'failed' },
              { action: 'Pharmacy Sync', time: '2 hours ago', status: 'success' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(activity.status === 'success' ? 'connected' : 'error')}
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(activity.status === 'success' ? 'connected' : 'error')}>
                  {activity.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}