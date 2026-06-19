import { useState, useRef } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, RotateCcw, FileJson } from 'lucide-react';
import { format } from 'date-fns';

interface ExportedData {
  version: string;
  exportedAt: string;
  data: {
    vitals: any[];
    medications: any[];
    patients: any[];
    offlineActions: any[];
  };
}

export function OfflineDataImportExport() {
  const { cache } = useOfflineSync();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const exportData: ExportedData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        data: {
          vitals: cache.vitals || [],
          medications: cache.medications || [],
          patients: cache.patientData || [],
          offlineActions: cache.pendingActions || []
        }
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `offline-data-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Exported ${exportData.data.vitals.length} vitals, ${exportData.data.medications.length} medications`,
        duration: 3000
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Could not export offline data. Check console for details.',
        variant: 'destructive',
        duration: 3000
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);

      const text = await file.text();
      const importedData: ExportedData = JSON.parse(text);

      // Validate import data structure
      if (!importedData.data || !Array.isArray(importedData.data.vitals)) {
        throw new Error('Invalid export file format');
      }

      // Merge with existing data
      const mergedVitals = [
        ...(cache.vitals || []),
        ...importedData.data.vitals
      ];

      const mergedMedications = [
        ...(cache.medications || []),
        ...importedData.data.medications
      ];

      const mergedPatients = [
        ...(cache.patients || []),
        ...importedData.data.patients
      ];

      // Store merged data back to cache (simplified - actual implementation would use indexedDB)
      localStorage.setItem('offline_vitals_cache', JSON.stringify(mergedVitals));
      localStorage.setItem('offline_medications_cache', JSON.stringify(mergedMedications));
      localStorage.setItem('offline_patients_cache', JSON.stringify(mergedPatients));

      toast({
        title: 'Import Successful',
        description: `Imported ${importedData.data.vitals.length} vitals, ${importedData.data.medications.length} medications`,
        duration: 3000
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Could not import offline data',
        variant: 'destructive',
        duration: 3000
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleRestore = async () => {
    if (!confirm('This will reset all offline data. Continue?')) return;

    try {
      localStorage.removeItem('offline_vitals_cache');
      localStorage.removeItem('offline_medications_cache');
      localStorage.removeItem('offline_patients_cache');
      localStorage.removeItem('offline_actions_queue');

      toast({
        title: 'Data Reset',
        description: 'All offline data has been cleared',
        duration: 3000
      });
    } catch (error) {
      console.error('Reset failed:', error);
      toast({
        title: 'Reset Failed',
        description: 'Could not reset offline data',
        variant: 'destructive',
        duration: 3000
      });
    }
  };

  const totalRecords = (cache.vitals?.length || 0) +
    (cache.medications?.length || 0) +
    (cache.patients?.length || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          Offline Data Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Storage Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border rounded p-3">
              <div className="text-sm text-muted-foreground">Vitals</div>
              <div className="text-2xl font-bold">{cache.vitals?.length || 0}</div>
            </div>
            <div className="border rounded p-3">
              <div className="text-sm text-muted-foreground">Medications</div>
              <div className="text-2xl font-bold">{cache.medications?.length || 0}</div>
            </div>
            <div className="border rounded p-3">
              <div className="text-sm text-muted-foreground">Patients</div>
              <div className="text-2xl font-bold">{cache.patients?.length || 0}</div>
            </div>
            <div className="border rounded p-3">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-bold">{totalRecords}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t pt-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Data Operations</div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleExport}
                  disabled={isExporting || totalRecords === 0}
                  className="gap-2"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? 'Exporting...' : 'Export to JSON'}
                </Button>

                <Button
                  onClick={handleImportClick}
                  disabled={isImporting}
                  className="gap-2"
                  variant="outline"
                >
                  <Upload className="h-4 w-4" />
                  {isImporting ? 'Importing...' : 'Import from JSON'}
                </Button>

                <Button
                  onClick={handleRestore}
                  disabled={totalRecords === 0}
                  className="gap-2"
                  variant="ghost"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Data
                </Button>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="border-t pt-4">
            <div className="text-xs text-muted-foreground space-y-2">
              <p>• Export creates a JSON file with all offline vitals, medications, and patient data</p>
              <p>• Import merges data from a previously exported JSON file</p>
              <p>• Reset clears all offline data permanently (cannot be undone)</p>
              <p>• Maximum storage: 50MB IndexedDB capacity</p>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
        />
      </CardContent>
    </Card>
  );
}
