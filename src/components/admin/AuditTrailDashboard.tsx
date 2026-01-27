import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Eye, Download, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  severity: string | null;
  ip_address: string | null;
  created_at: string;
}

export function AuditTrailDashboard() {
  const { hospital } = useAuth();
  const [auditTrail, setAuditTrail] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (hospital?.id) {
      fetchAuditLogs();
    }
  }, [hospital?.id]);

  const fetchAuditLogs = async () => {
    if (!hospital?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('hospital_id', hospital.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Map activity_logs to AuditLogEntry format
      const mappedData: AuditLogEntry[] = (data || []).map(log => ({
        id: log.id,
        user_id: log.user_id,
        action: log.action_type,
        action_type: log.action_type,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        severity: log.severity,
        ip_address: log.ip_address,
        created_at: log.created_at,
      }));
      
      setAuditTrail(mappedData);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('view')) return <Eye className="h-4 w-4" />;
    if (action.includes('export')) return <Download className="h-4 w-4" />;
    if (action.includes('delete')) return <AlertTriangle className="h-4 w-4" />;
    return <Shield className="h-4 w-4" />;
  };

  const filteredLogs = auditTrail.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const criticalEvents = auditTrail.filter(log => log.severity === 'critical').length;
  const highRiskEvents = auditTrail.filter(log => log.severity === 'high').length;

  if (isLoading) {
    return <div className="p-4">Loading audit trail...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditTrail.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{highRiskEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">HIPAA</div>
            <p className="text-xs text-muted-foreground">Compliant</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Audit Trail</CardTitle>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <p className="text-muted-foreground">No audit events found</p>
          ) : (
            <div className="space-y-3">
              {filteredLogs.slice(0, 20).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getActionIcon(log.action)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{log.action.replace('_', ' ')}</span>
                        <Badge className={getSeverityColor(log.severity)}>
                          {log.severity || 'info'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {log.entity_type || 'system'} • {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        IP: {log.ip_address || 'N/A'} • User: {log.user_id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}