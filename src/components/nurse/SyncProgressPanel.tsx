import { useCallback, useState } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, Database, Zap } from 'lucide-react';
import { format } from 'date-fns';

export function SyncProgressPanel() {
  const { cache, isOnline, syncData, pendingActionCount } = useOfflineSync();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const syncProgress = pendingActionCount === 0 
    ? 100 
    : Math.max(10, Math.floor(100 * (1 - pendingActionCount / (pendingActionCount + 1))));

  const handleManualSync = useCallback(async () => {
    if (!isOnline) {
      toast({
        title: "Cannot sync offline",
        description: "You must be online to sync data",
        variant: "destructive"
      });
      return;
    }

    setIsSyncing(true);
    try {
      await syncData();
      toast({
        title: "Sync complete",
        description: `Successfully synced ${pendingActionCount} actions`
      });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, syncData, pendingActionCount, toast]);

  const handleExportData = useCallback(async () => {
    try {
      setExportProgress(25);
      
      // Prepare export data
      const exportData = {
        exportedAt: new Date().toISOString(),
        vitals: cache.vitals || [],
        medications: cache.medications || [],
        patientData: cache.patientData || [],
        pendingActions: cache.pendingActions || [],
        metadata: {
          vitalCount: cache.vitals?.length || 0,
          medicationCount: cache.medications?.length || 0,
          patientCount: cache.patientData?.length || 0,
          pendingActionCount: cache.pendingActions?.length || 0
        }
      };

      setExportProgress(60);

      // Create JSON blob
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      setExportProgress(80);

      // Create download link
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `offline-data-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportProgress(100);
      
      toast({
        title: "Export complete",
        description: `Downloaded ${exportData.metadata.vitalCount} vitals and ${exportData.metadata.pendingActionCount} pending actions`
      });

      // Reset progress after delay
      setTimeout(() => setExportProgress(0), 2000);
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
      setExportProgress(0);
    }
  }, [cache, toast]);

  const totalRecords = (cache.vitals?.length || 0) + 
                      (cache.medications?.length || 0) + 
                      (cache.patientData?.length || 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Sync Status
          </CardTitle>
          {isOnline ? (
            <Badge className="bg-green-100 text-green-800">Online</Badge>
          ) : (
            <Badge variant="destructive">Offline</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending Actions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Pending Actions</span>
            <Badge variant={pendingActionCount > 0 ? "secondary" : "outline"}>
              {pendingActionCount}
            </Badge>
          </div>
          <Progress value={syncProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {syncProgress === 100 
              ? "All data synced" 
              : `${pendingActionCount} action${pendingActionCount !== 1 ? 's' : ''} waiting to sync`}
          </p>
        </div>

        {/* Storage Summary */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {cache.vitals?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Vitals</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {cache.medications?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Medications</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {cache.patientData?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Patients</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleManualSync}
            disabled={!isOnline || isSyncing || pendingActionCount === 0}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
          <Button
            onClick={handleExportData}
            variant="outline"
            disabled={totalRecords === 0}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Export Progress */}
        {exportProgress > 0 && exportProgress < 100 && (
          <div className="space-y-1">
            <p className="text-xs font-medium">Exporting...</p>
            <Progress value={exportProgress} className="h-1" />
          </div>
        )}

        {/* Storage Info */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Database className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
          <div className="text-xs text-blue-800">
            <p className="font-medium">Storage Information</p>
            <p className="mt-1">
              {totalRecords} records cached locally • Auto-syncs when online
            </p>
            <p className="mt-1">
              Data is encrypted and stored in IndexedDB (50MB capacity)
            </p>
          </div>
        </div>

        {/* Offline Notice */}
        {!isOnline && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs font-medium text-yellow-900">
              Offline Mode Active
            </p>
            <p className="text-xs text-yellow-800 mt-1">
              Your data will sync automatically once you reconnect to the internet
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
