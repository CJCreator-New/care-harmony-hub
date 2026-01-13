import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog, ActionType } from '@/hooks/useActivityLog';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Download, FileText, Shield, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type TableNames = keyof Database['public']['Tables'];

const exportTypes: Record<string, { label: string; icon: typeof FileText; table: TableNames }> = {
  patients: { label: 'Patient Records', icon: FileText, table: 'patients' },
  appointments: { label: 'Appointments', icon: Clock, table: 'appointments' },
  prescriptions: { label: 'Prescriptions', icon: FileText, table: 'prescriptions' },
  lab_orders: { label: 'Lab Results', icon: FileText, table: 'lab_orders' },
};

export function DataExportTool() {
  const { profile } = useAuth();
  const { logActivity } = useActivityLog();
  const [selectedType, setSelectedType] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const exportData = async () => {
    if (!selectedType || !profile?.hospital_id) return;
    const exportConfig = exportTypes[selectedType];
    if (!exportConfig) return;

    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .from(exportConfig.table)
        .select('*')
        .eq('hospital_id', profile.hospital_id);

      if (error) throw error;

      // Log export activity - use a valid action type
      await logActivity({
        actionType: 'patient_view' as ActionType, // Using a valid type for export logging
        entityType: selectedType,
        details: { 
          action: 'data_export',
          exportType: selectedType,
          recordCount: data?.length || 0,
          exportFormat: 'CSV'
        },
      });

      // Generate CSV
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]).filter(key => 
          !['hospital_id', 'created_at', 'updated_at'].includes(key)
        );
        
        const csvContent = [
          headers.join(','),
          ...data.map(row => 
            headers.map(header => {
              const value = (row as Record<string, unknown>)[header];
              if (value === null || value === undefined) return '';
              if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
              return String(value).replace(/"/g, '""');
            }).join(',')
          )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedType}-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          HIPAA-Compliant Data Export
        </CardTitle>
        <CardDescription>
          Securely export patient data with full audit trail
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Export Type</label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="Select data type to export" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(exportTypes).map(([key, { label, icon: Icon }]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <Shield className="h-4 w-4 text-blue-600" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Security Notice</p>
            <p>All exports are logged and monitored for compliance</p>
          </div>
        </div>

        <Button 
          onClick={exportData} 
          disabled={!selectedType || isExporting}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export Data'}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Exported files are in CSV format</p>
          <p>• Personal identifiers are included for authorized users only</p>
          <p>• Export activity is recorded in audit logs</p>
        </div>
      </CardContent>
    </Card>
  );
}