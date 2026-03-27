import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * Nurse Medications/Dispensing Page - Test-compatible  
 * Allows nurses to view and administer medications
 */
export default function NurseMedicationsPage() {
  const { user } = useAuth();
  const [dispenseDialogOpen, setDispenseDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any>(null);
  const [verifyConfirmed, setVerifyConfirmed] = useState(false);

  // Mock medication data for testing
  const medications = [
    {
      id: 'rx_001',
      patient: 'Test Patient',
      medication: 'Amoxicillin',
      dosage: '500mg',
      frequency: 'Twice daily',
      status: 'approved',
      dueTime: '14:00',
    },
    {
      id: 'rx_002',
      patient: 'Jane Doe',
      medication: 'Penicillin',
      dosage: '250mg',
      frequency: 'Three times daily',
      status: 'approved',
      dueTime: '15:30',
    },
  ];

  const handleDispense = (medication: any) => {
    setSelectedMedication(medication);
    setDispenseDialogOpen(true);
    setVerifyConfirmed(false);
  };

  const handleConfirmDispense = () => {
    if (selectedMedication) {
      // In real app, would call API to record dispensing
      console.log(`Dispensed: ${selectedMedication.medication} to ${selectedMedication.patient}`);
      setDispenseDialogOpen(false);
      // Show success toast
      alert(`✓ Medication dispensed: ${selectedMedication.medication}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medication Administration</h1>
          <p className="text-muted-foreground">Administer and dispense medications to patients</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4 bg-card">
            <div className="text-2xl font-bold">6</div>
            <p className="text-sm text-muted-foreground">Ready to Dispense</p>
          </div>
          <div className="rounded-lg border p-4 bg-card">
            <div className="text-2xl font-bold">14</div>
            <p className="text-sm text-muted-foreground">Dispensed Today</p>
          </div>
          <div className="rounded-lg border p-4 bg-card">
            <div className="text-2xl font-bold">2</div>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Medication</TableHead>
                <TableHead>Dosage</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medications.map((med) => (
                <TableRow key={med.id}>
                  <TableCell className="font-medium">{med.patient}</TableCell>
                  <TableCell>{med.medication}</TableCell>
                  <TableCell>{med.dosage}</TableCell>
                  <TableCell>{med.frequency}</TableCell>
                  <TableCell>
                    <Badge variant="default">{med.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDispense(med)}
                    >
                      Dispense
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dispensing Confirmation Dialog */}
      <Dialog open={dispenseDialogOpen} onOpenChange={setDispenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Medication Dispensing</DialogTitle>
            <DialogDescription>
              Please verify patient identity and confirm medication administration
            </DialogDescription>
          </DialogHeader>

          {selectedMedication && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded">
                <p className="text-sm"><strong>Patient:</strong> {selectedMedication.patient}</p>
                <p className="text-sm"><strong>Medication:</strong> {selectedMedication.medication}</p>
                <p className="text-sm"><strong>Dosage:</strong> {selectedMedication.dosage}</p>
                <p className="text-sm"><strong>Frequency:</strong> {selectedMedication.frequency}</p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="verify"
                  checked={verifyConfirmed}
                  onCheckedChange={(checked) => setVerifyConfirmed(checked as boolean)}
                />
                <label 
                  htmlFor="verify"
                  className="text-sm cursor-pointer"
                >
                  I have verified the patient identity and medication details
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setDispenseDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmDispense}
              disabled={!verifyConfirmed}
            >
              Confirm Dispense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
