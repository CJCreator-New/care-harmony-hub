import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Pill,
  Search,
  User,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useRecordMedicationAdministration } from '@/hooks/useNurseWorkflow';
import { usePatients, useSearchPatients } from '@/lib/hooks/patients';
import { supabase } from '@/integrations/supabase/client';

interface MedicationAdministrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export function MedicationAdministrationModal({
  open,
  onOpenChange,
  patient: initialPatient,
}: MedicationAdministrationModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<{
    id: string;
    first_name: string;
    last_name: string;
  } | null>(null);
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [route, setRoute] = useState('oral');
  const [administeredAt, setAdministeredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [status, setStatus] = useState<'given' | 'refused' | 'held' | 'not_given'>('given');
  const [notes, setNotes] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [activePrescriptions, setActivePrescriptions] = useState<Array<{ id: string; medication_name: string; dosage: string; route?: string | null }>>([]);

  const { data: searchResults = [], isLoading: isSearching } = useSearchPatients(searchTerm);
  const { data: patientsData, isLoading: patientsLoading } = usePatients({ limit: 50 });
  const patientOptions = searchTerm.length >= 2 ? searchResults : (patientsData?.patients || []);
  const recordAdministration = useRecordMedicationAdministration();

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setSelectedPatient(null);
      setMedicationName('');
      setDosage('');
      setRoute('oral');
      setAdministeredAt(new Date().toISOString().slice(0, 16));
      setStatus('given');
      setNotes('');
      setIsComplete(false);
    } else if (initialPatient) {
      setSelectedPatient(initialPatient);
    }
  }, [open, initialPatient]);

  useEffect(() => {
    if (!selectedPatient?.id) {
      setActivePrescriptions([]);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from('prescription_items')
        .select('id, medication_name, dosage, route, prescription:prescriptions!inner(patient_id, status)')
        .eq('prescription.patient_id', selectedPatient.id)
        .in('prescription.status', ['pending', 'approved', 'active']);
      setActivePrescriptions((data || []) as any);
    })();
  }, [selectedPatient?.id]);

  const handleSubmit = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient before recording administration.');
      return;
    }

    if (!medicationName.trim()) {
      toast.error('Medication name is required.');
      return;
    }

    if (!dosage.trim()) {
      toast.error('Dosage is required.');
      return;
    }

    try {
      await recordAdministration.mutateAsync({
        patient_id: selectedPatient.id,
        medication_name: medicationName,
        dosage,
        route,
        administered_at: new Date(administeredAt).toISOString(),
        status,
        notes: notes || undefined,
      });
      setIsComplete(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to record medication';
      toast.error(`Medication recording failed: ${errorMessage}`);
      console.error('Error recording medication:', error);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'given':
        return 'success';
      case 'refused':
        return 'warning';
      case 'held':
        return 'secondary';
      case 'not_given':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (isComplete) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">✅ Medication Recorded</h3>
              <p className="text-muted-foreground">
                {medicationName} {dosage} - {status}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Record Medication Administration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Selection */}
          {!selectedPatient ? (
            <div className="space-y-3">
              <Label>Select Patient</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {(isSearching || patientsLoading) && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {patientOptions.length > 0 && (
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {patientOptions.map((p) => (
                      <Card
                        key={p.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setSelectedPatient(p)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <User className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {p.first_name} {p.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">MRN: {p.mrn}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
                  Change
                </Button>
              </CardContent>
            </Card>
          )}

          {selectedPatient && (
            <>
              {/* Medication Details */}
              <div className="space-y-4">
                {activePrescriptions.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Medication *</Label>
                    <Select
                      value={medicationName}
                      onValueChange={(value) => {
                        const prescription = activePrescriptions.find((rx) => rx.medication_name === value);
                        setMedicationName(value);
                        if (prescription?.dosage) setDosage(prescription.dosage);
                        if (prescription?.route) setRoute(prescription.route.toLowerCase());
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select active prescription" />
                      </SelectTrigger>
                      <SelectContent>
                        {activePrescriptions.map((rx) => (
                          <SelectItem key={rx.id} value={rx.medication_name}>
                            {rx.medication_name} - {rx.dosage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Medication Name *</Label>
                    <Input
                      placeholder="No active prescriptions found; enter medication"
                      value={medicationName}
                      onChange={(e) => setMedicationName(e.target.value)}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dosage *</Label>
                    <Input
                      placeholder="e.g., 500mg"
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Route</Label>
                    <Select value={route} onValueChange={setRoute}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oral">Oral</SelectItem>
                        <SelectItem value="iv">IV</SelectItem>
                        <SelectItem value="im">IM</SelectItem>
                        <SelectItem value="sc">Subcutaneous</SelectItem>
                        <SelectItem value="topical">Topical</SelectItem>
                        <SelectItem value="inhaled">Inhaled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Time of Administration *</Label>
                  <Input
                    type="datetime-local"
                    value={administeredAt}
                    onChange={(e) => setAdministeredAt(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="given">Given</SelectItem>
                      <SelectItem value="refused">Refused by Patient</SelectItem>
                      <SelectItem value="held">Held</SelectItem>
                      <SelectItem value="not_given">Not Given</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {status !== 'given' && (
                  <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg border border-warning/20">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                    <p className="text-sm">Please document the reason in the notes below.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={recordAdministration.isPending}>
            {recordAdministration.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Record Administration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
