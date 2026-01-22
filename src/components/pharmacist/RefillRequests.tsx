import { useState } from 'react';
import { useHospitalRefillRequests, useUpdateRefillRequest } from '@/hooks/useRefillRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export function RefillRequests() {
  const [refillTab, setRefillTab] = useState<'pending' | 'processed'>('pending');
  const { data: pendingRefills = [], isLoading } = useHospitalRefillRequests(refillTab === 'pending' ? 'pending' : undefined);
  const updateRefillMutation = useUpdateRefillRequest();

  const refillsToShow = refillTab === 'pending' 
    ? pendingRefills.filter(r => r.status === 'pending')
    : pendingRefills.filter(r => r.status !== 'pending');

  const handleRefillAction = async (requestId: string, action: 'approved' | 'denied' | 'fulfilled') => {
    await updateRefillMutation.mutateAsync({ requestId, status: action });
  };

  const getRefillStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 font-normal">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-normal">Approved</Badge>;
      case 'denied':
        return <Badge variant="destructive" className="font-normal">Denied</Badge>;
      case 'fulfilled':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 font-normal">Fulfilled</Badge>;
      default:
        return <Badge variant="secondary" className="font-normal">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Refill Requests
            </CardTitle>
            <CardDescription>Manage patient-requested medication refills</CardDescription>
          </div>
          <Tabs value={refillTab} onValueChange={(v) => setRefillTab(v as 'pending' | 'processed')}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="processed">Processed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-12">Loading refill requests...</div>
        ) : refillsToShow.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium mb-1">No {refillTab} refill requests</p>
            <p className="text-sm">Refill requests from patients will appear here</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Medications</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refillsToShow.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {request.patient?.first_name} {request.patient?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{request.patient?.mrn}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {request.prescription?.items?.slice(0, 2).map((item: any, idx: number) => (
                        <p key={idx} className="text-xs">
                          • {item.medication_name} ({item.dosage})
                        </p>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm max-w-[200px] truncate">
                      {request.reason || 'No reason provided'}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(parseISO(request.requested_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>{getRefillStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-right">
                    {request.status === 'pending' && (
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-green-200 text-green-700 hover:bg-green-50"
                          onClick={() => handleRefillAction(request.id, 'approved')}
                          disabled={updateRefillMutation.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => handleRefillAction(request.id, 'denied')}
                          disabled={updateRefillMutation.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Deny
                        </Button>
                      </div>
                    )}
                    {request.status === 'approved' && (
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => handleRefillAction(request.id, 'fulfilled')}
                        disabled={updateRefillMutation.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Mark Fulfilled
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
