import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, XCircle } from 'lucide-react';
import { blockchainAuditService } from '@/services/blockchainAuditService';

export const BlockchainAuditViewer = ({ resourceId }: { resourceId: string }) => {
  const [trail, setTrail] = useState<any[]>([]);
  const [verified, setVerified] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadAuditTrail();
  }, [resourceId]);

  const loadAuditTrail = async () => {
    const data = await blockchainAuditService.getAuditTrail(resourceId);
    setTrail(data);
    
    const verifications: Record<string, boolean> = {};
    for (const entry of data) {
      verifications[entry.id] = await blockchainAuditService.verifyIntegrity(entry.id);
    }
    setVerified(verifications);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Blockchain Audit Trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {trail.map((entry) => (
            <div key={entry.id} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{entry.action}</span>
                {verified[entry.id] ? (
                  <Badge variant="outline" className="bg-green-50">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Invalid
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(entry.timestamp).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                Hash: {entry.hash?.substring(0, 16)}...
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
