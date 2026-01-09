import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBackupManager } from '@/hooks/useBackupManager';
import { Download, Upload, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function BackupRecoveryDashboard() {
  const {
    backups,
    isLoading,
    createBackup,
    restoreBackup,
    isCreatingBackup,
    isRestoring,
  } = useBackupManager();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading backup data...</div>;
  }

  const recentBackups = backups?.slice(0, 5) || [];
  const completedBackups = backups?.filter(b => b.status === 'completed') || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Backups</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backups?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedBackups.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(completedBackups.reduce((sum, b) => sum + b.size_mb, 0))} MB
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {completedBackups[0] ? 
                formatDistanceToNow(new Date(completedBackups[0].created_at), { addSuffix: true }) :
                'Never'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => createBackup({ type: 'critical' })}
              disabled={isCreatingBackup}
              className="w-full"
            >
              {isCreatingBackup ? 'Creating...' : 'Create Critical Backup'}
            </Button>
            <Button
              onClick={() => createBackup({ type: 'full' })}
              disabled={isCreatingBackup}
              variant="outline"
              className="w-full"
            >
              Create Full Backup
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Backups</CardTitle>
          </CardHeader>
          <CardContent>
            {recentBackups.length === 0 ? (
              <p className="text-muted-foreground">No backups found</p>
            ) : (
              <div className="space-y-3">
                {recentBackups.map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(backup.status)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium capitalize">{backup.type}</span>
                          <Badge className={getStatusColor(backup.status)}>
                            {backup.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(backup.created_at), { addSuffix: true })} • {backup.size_mb} MB
                        </p>
                      </div>
                    </div>
                    {backup.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreBackup(backup.id)}
                        disabled={isRestoring}
                      >
                        {isRestoring ? 'Restoring...' : 'Restore'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}