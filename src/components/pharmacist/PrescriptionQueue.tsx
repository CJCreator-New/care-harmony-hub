import { useState } from 'react';
import { usePrescriptions, useDispensePrescription } from '@/hooks/usePrescriptions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Search, 
  Pill, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MoreHorizontal,
  Printer,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function PrescriptionQueue() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const { data: prescriptions, isLoading } = usePrescriptions();
  const dispenseMutation = useDispensePrescription();

  const filteredPrescriptions = prescriptions?.filter(p => 
    p.patient?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patient?.mrn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDispense = async (id: string) => {
    await dispenseMutation.mutateAsync(id);
    setSelectedPrescription(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'verified': return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Verified</Badge>;
      case 'dispensed': return <Badge variant="default" className="bg-green-100 text-green-800">Dispensed</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by patient or MRN..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prescription Queue</CardTitle>
          <CardDescription>Real-time list of prescriptions awaiting processing</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>MRN</TableHead>
                <TableHead>Medications</TableHead>
                <TableHead>Prescribed By</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading prescriptions...
                  </TableCell>
                </TableRow>
              ) : filteredPrescriptions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No prescriptions found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPrescriptions?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.patient?.first_name} {p.patient?.last_name}
                    </TableCell>
                    <TableCell>{p.patient?.mrn}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {p.items?.slice(0, 2).map((item: any) => (
                          <span key={`med-${item.id}`} className="text-xs">
                            • {item.medication_name} ({item.dosage})
                          </span>
                        ))}
                        {p.items && p.items.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            + {p.items.length - 2} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>Dr. {p.prescriber?.last_name}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(p.created_at), 'HH:mm')}
                    </TableCell>
                    <TableCell>{getStatusBadge(p.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedPrescription(p)}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Prescription Details & Dispensing Modal */}
      <Dialog open={!!selectedPrescription} onOpenChange={() => setSelectedPrescription(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dispense Prescription</DialogTitle>
            <DialogDescription>
              Verify medication details before dispensing to the patient
            </DialogDescription>
          </DialogHeader>

          {selectedPrescription && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-bold">Patient</label>
                  <p className="font-medium">{selectedPrescription.patient?.first_name} {selectedPrescription.patient?.last_name}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-bold">MRN</label>
                  <p className="font-medium">{selectedPrescription.patient?.mrn}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-bold">Prescribed By</label>
                  <p className="font-medium">Dr. {selectedPrescription.prescriber?.first_name} {selectedPrescription.prescriber?.last_name}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-bold">Priority</label>
                  <p className="font-medium capitalize">{selectedPrescription.priority || 'Normal'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Prescribed Medications
                </h4>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Drug Name</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead>Freq</TableHead>
                        <TableHead>Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPrescription.items?.map((item: any) => (
                        <TableRow key={`item-${item.id}`}>
                          <TableCell className="font-medium">{item.medication_name}</TableCell>
                          <TableCell>{item.dosage}</TableCell>
                          <TableCell>{item.frequency}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedPrescription.notes && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Doctor's Notes
                  </h4>
                  <p className="text-sm p-3 bg-yellow-50 text-yellow-800 rounded border border-yellow-200">
                    {selectedPrescription.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
            <Button variant="ghost" onClick={() => {
              // Print prescription label
              if (selectedPrescription) {
                const printContent = `
                  <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Prescription Label</h2>
                    <p><strong>Patient:</strong> ${selectedPrescription.patient?.first_name} ${selectedPrescription.patient?.last_name}</p>
                    <p><strong>MRN:</strong> ${selectedPrescription.patient?.mrn}</p>
                    <p><strong>Date:</strong> ${format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
                    <hr/>
                    <h3>Medications:</h3>
                    ${selectedPrescription.items?.map((item: any) => `
                      <p><strong>${item.medication_name}</strong> - ${item.dosage} - ${item.frequency} - Qty: ${item.quantity}</p>
                    `).join('')}
                    <hr/>
                    <p><strong>Prescriber:</strong> Dr. ${selectedPrescription.prescriber?.first_name} ${selectedPrescription.prescriber?.last_name}</p>
                  </div>
                `;
                
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(printContent);
                  printWindow.document.close();
                  printWindow.print();
                }
                toast.success('Printing prescription label...');
              }
            }}>
              <Printer className="h-4 w-4 mr-2" />
              Print Label
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedPrescription(null)}>Cancel</Button>
              <Button 
                onClick={() => handleDispense(selectedPrescription.id)}
                disabled={dispenseMutation.isPending || selectedPrescription?.status === 'dispensed'}
              >
                {dispenseMutation.isPending ? 'Processing...' : 'Confirm Dispensing'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
