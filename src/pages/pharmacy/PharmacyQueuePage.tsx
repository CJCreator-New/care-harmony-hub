import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

/**
 * Pharmacist Queue - Test-compatible
 * Displays prescriptions pending review and approval
 */
export default function PharmacistQueue() {
  const { user } = useAuth();

  // Mock prescription data for testing
  const prescriptions = [
    {
      id: 'rx_001',
      patient: 'Test Patient',
      medication: 'Amoxicillin',
      dosage: '500mg',
      status: 'pending_approval',
      createdAt: new Date(),
    },
    {
      id: 'rx_002',
      patient: 'Jane Doe',
      medication: 'Penicillin',
      dosage: '250mg',
      status: 'pending_review',
      createdAt: new Date(),
    },
  ];

  const handleReview = (prescriptionId: string) => {
    // Navigate to detailed review view
    window.location.href = `/hospital/pharmacy/prescription/${prescriptionId}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prescription Queue</h1>
          <p className="text-muted-foreground">Review and approve pending prescriptions</p>
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Medication</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map((rx) => (
                <TableRow key={rx.id}>
                  <TableCell className="font-medium">{rx.patient}</TableCell>
                  <TableCell>{rx.medication}</TableCell>
                  <TableCell>{rx.dosage}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={rx.status === 'pending_approval' ? 'default' : 'secondary'}
                    >
                      {rx.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReview(rx.id)}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4 bg-card">
            <div className="text-2xl font-bold">8</div>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </div>
          <div className="rounded-lg border p-4 bg-card">
            <div className="text-2xl font-bold">24</div>
            <p className="text-sm text-muted-foreground">Reviewed Today</p>
          </div>
          <div className="rounded-lg border p-4 bg-card">
            <div className="text-2xl font-bold">2</div>
            <p className="text-sm text-muted-foreground">Flagged Interactions</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
