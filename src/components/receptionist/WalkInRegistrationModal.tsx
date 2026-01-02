import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  User,
  Search,
  UserPlus,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useSearchPatients } from '@/hooks/usePatients';
import { useAddToQueue, PriorityLevel } from '@/hooks/useQueue';
import { toast } from 'sonner';

interface WalkInRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SelectedPatient {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string;
}

export function WalkInRegistrationModal({ open, onOpenChange }: WalkInRegistrationModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);
  const [priority, setPriority] = useState<PriorityLevel>('normal');
  const [department, setDepartment] = useState('General');
  const [reason, setReason] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [queueNumber, setQueueNumber] = useState<number | null>(null);

  const { data: searchResults = [], isLoading: isSearching } = useSearchPatients(searchTerm);
  const addToQueue = useAddToQueue();

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setSelectedPatient(null);
      setPriority('normal');
      setDepartment('General');
      setReason('');
      setIsComplete(false);
      setQueueNumber(null);
    }
  }, [open]);

  const handleSelectPatient = (patient: SelectedPatient) => {
    setSelectedPatient(patient);
  };

  const handleRegister = async () => {
    if (!selectedPatient) return;

    try {
      const result = await addToQueue.mutateAsync({
        patientId: selectedPatient.id,
        priority,
        department,
      });
      setQueueNumber(result.queue_number);
      setIsComplete(true);
    } catch (error) {
      // Error handled by mutation
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
              <h3 className="text-lg font-semibold">Walk-In Registered!</h3>
              <p className="text-muted-foreground">
                {selectedPatient?.first_name} {selectedPatient?.last_name} has been added to the queue.
              </p>
            </div>
            {queueNumber && (
              <div className="inline-flex items-center gap-2 bg-primary/10 px-6 py-3 rounded-lg">
                <span className="text-sm text-muted-foreground">Queue Number:</span>
                <span className="text-3xl font-bold text-primary">#{queueNumber}</span>
              </div>
            )}
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Walk-In Registration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!selectedPatient ? (
            <>
              {/* Patient Search */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search patient by name or MRN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {isSearching && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No patients found. Please register the patient first.
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {searchResults.map((patient) => (
                      <Card
                        key={patient.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => handleSelectPatient(patient)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {patient.first_name} {patient.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">MRN: {patient.mrn}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Selected Patient */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {selectedPatient.first_name} {selectedPatient.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">MRN: {selectedPatient.mrn}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
                      Change
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Priority Selection */}
              <div className="space-y-2">
                <Label>Priority Level</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as PriorityLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                    <SelectItem value="Outpatient">Outpatient</SelectItem>
                    <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="Cardiology">Cardiology</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label>Reason for Visit (Optional)</Label>
                <Textarea
                  placeholder="Brief description of the visit reason..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {selectedPatient && (
            <Button
              onClick={handleRegister}
              disabled={addToQueue.isPending}
              className="w-full"
            >
              {addToQueue.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add to Queue
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
