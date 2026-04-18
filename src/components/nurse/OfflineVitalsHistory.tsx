import { useEffect, useState } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pagination, Pagination as PaginationComponent } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Trash2, Upload, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface OfflineVital {
  id: string;
  patient_id: string;
  systolic_bp: number;
  diastolic_bp: number;
  temperature: number;
  respiratory_rate: number;
  spo2: number;
  weight: number;
  height: number;
  pain_level: number;
  chief_complaint?: string;
  captured_at: string;
  synced?: boolean;
}

const ITEMS_PER_PAGE = 10;

export function OfflineVitalsHistory() {
  const { cache, isOnline } = useOfflineSync();
  const [currentPage, setCurrentPage] = useState(1);
  const [vitals, setVitals] = useState<OfflineVital[]>([]);
  const [loading, setLoading] = useState(true);

  // Load offline vitals from cache
  useEffect(() => {
    const loadVitals = () => {
      try {
        // Reconstruct vitals from cache
        const offlineVitals: OfflineVital[] = cache.vitals.map((v: any, idx: number) => ({
          id: `offline-${Date.now()}-${idx}`,
          ...v,
          synced: false
        }));
        
        setVitals(offlineVitals);
      } catch (error) {
        console.error('Failed to load offline vitals:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVitals();
  }, [cache.vitals]);

  const totalPages = Math.ceil(vitals.length / ITEMS_PER_PAGE);
  const paginatedVitals = vitals.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getPriorityBadge = (synced: boolean) => {
    if (synced) {
      return <Badge variant="outline" className="bg-green-50">Synced</Badge>;
    }
    return <Badge variant="secondary" className="bg-yellow-50">Pending</Badge>;
  };

  if (loading) {
    return <div>Loading vitals...</div>;
  }

  if (vitals.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No offline vitals recorded yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Offline Vitals History</CardTitle>
          {!isOnline && (
            <Badge variant="destructive" className="gap-1">
              <Clock className="h-3 w-3" />
              {vitals.filter(v => !v.synced).length} pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Patient ID</TableHead>
                  <TableHead scope="col">BP (mmHg)</TableHead>
                  <TableHead scope="col">Temp (°C)</TableHead>
                  <TableHead scope="col">RR (bpm)</TableHead>
                  <TableHead scope="col">SpO2 (%)</TableHead>
                  <TableHead scope="col">Pain</TableHead>
                  <TableHead scope="col">Recorded</TableHead>
                  <TableHead scope="col">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVitals.map((vital) => (
                  <TableRow key={vital.id}>
                    <TableCell className="font-medium">{vital.patient_id}</TableCell>
                    <TableCell>
                      {vital.systolic_bp}/{vital.diastolic_bp}
                    </TableCell>
                    <TableCell>{vital.temperature.toFixed(1)}</TableCell>
                    <TableCell>{vital.respiratory_rate}</TableCell>
                    <TableCell>{vital.spo2}</TableCell>
                    <TableCell>{vital.pain_level}/10</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(vital.captured_at), 'HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(vital.synced ?? false)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}

          {/* Info Footer */}
          <div className="pt-4 border-t text-sm text-muted-foreground">
            <p>Showing {paginatedVitals.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-{Math.min(currentPage * ITEMS_PER_PAGE, vitals.length)} of {vitals.length} records</p>
            {cache.vitals.some((v: any) => v.chief_complaint) && (
              <p className="mt-1">💡 Chief complaints are recorded with each vital</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
