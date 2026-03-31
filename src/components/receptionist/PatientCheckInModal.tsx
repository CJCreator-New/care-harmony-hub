import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  User,
  Calendar,
  Clock,
  CreditCard,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Zap,
} from 'lucide-react';
import { useSearchPatients } from '@/hooks/usePatients';
import { useTodayAppointments, Appointment } from '@/hooks/useAppointments';
import { PriorityLevel } from '@/hooks/useQueue';
import { useUnifiedCheckIn } from '@/hooks/useUnifiedCheckIn';
import { format } from 'date-fns';
import { CURRENCY_SYMBOL } from '@/lib/currency';
import { toast } from 'sonner';

interface PatientCheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CheckInStep = 'search' | 'verify' | 'insurance' | 'copay' | 'complete' | 'express';

interface SelectedPatient {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string;
  date_of_birth: string;
  phone: string | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_group_number: string | null;
  insurance_status?: string;
  last_visit?: string;
}

export function PatientCheckInModal({ open, onOpenChange }: PatientCheckInModalProps) {
  const [step, setStep] = useState<CheckInStep>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [insuranceVerified, setInsuranceVerified] = useState(false);
  const [copayAmount, setCopayAmount] = useState('');
  const [sendSmsConfirmation, setSendSmsConfirmation] = useState(true);
  const [sendEmailConfirmation, setSendEmailConfirmation] = useState(false);
  const [copayCollected, setCopayCollected] = useState(false);
  const [priority, setPriority] = useState<PriorityLevel>('normal');
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [completedQueueNumber, setCompletedQueueNumber] = useState<number | null>(null);

  const { data: searchResults = [], isLoading: isSearching } = useSearchPatients(searchTerm);
  const { data: todayAppointments = [] } = useTodayAppointments();
  const { checkIn, isPending } = useUnifiedCheckIn();

  // Check if patient is eligible for express check-in
  const isEligibleForExpressCheckIn = (patient: SelectedPatient) => {
    return (
      patient.insurance_provider &&
      patient.insurance_policy_number &&
      patient.insurance_status === 'active' &&
      patient.last_visit // Has visited before
    );
  };

  // Handle express check-in
  const handleExpressCheckIn = async (patient: SelectedPatient, appointment?: Appointment) => {
    try {
      const queueNumber = await checkIn({
        patient,
        appointmentId: appointment?.id,
        priority,
        isWalkIn: !appointment,
      });
      setCompletedQueueNumber(queueNumber);
      setStep('complete');
    } catch (error) {
      toast.error('Express check-in failed');
    }
  };

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('search');
      setSearchTerm('');
      setSelectedPatient(null);
      setSelectedAppointment(null);
      setIdentityVerified(false);
      setInsuranceVerified(false);
      setCopayAmount('');
      setCopayCollected(false);
      setPriority('normal');
      setIsWalkIn(false);
      setCompletedQueueNumber(null);
      setSendSmsConfirmation(true);
      setSendEmailConfirmation(false);
    }
  }, [open]);

  // Find patient's appointment for today
  const patientAppointments = selectedPatient
    ? todayAppointments.filter(
        (apt) => apt.patient_id === selectedPatient.id && apt.status === 'scheduled'
      )
    : [];

  const handleSelectPatient = (patient: SelectedPatient) => {
    setSelectedPatient(patient);
    const appointments = todayAppointments.filter(
      (apt) => apt.patient_id === patient.id && apt.status === 'scheduled'
    );
    if (appointments.length === 1) {
      setSelectedAppointment(appointments[0]);
      setIsWalkIn(false);
    } else if (appointments.length === 0) {
      // Auto-enable walk-in for patients with no scheduled appointment.
      setIsWalkIn(true);
    }
    setStep('verify');
  };

  useEffect(() => {
    if (!selectedPatient) return;

    const hasScheduledAppointment = todayAppointments.some(
      (apt) => apt.patient_id === selectedPatient.id && apt.status === 'scheduled'
    );

    if (!hasScheduledAppointment) {
      setIsWalkIn(true);
    }
  }, [selectedPatient, todayAppointments]);

  const handleVerifyIdentity = () => {
    if (!identityVerified) {
      toast.error('Please verify patient identity');
      return;
    }
    setStep('insurance');
  };

  const handleVerifyInsurance = () => {
    setStep('copay');
  };

  const handleCompleteCheckIn = async () => {
    if (!selectedPatient) return;

    try {
      if (selectedAppointment) {
        const queueNumber = await checkIn({
          patient: selectedPatient,
          appointmentId: selectedAppointment.id,
          priority,
        });
        setCompletedQueueNumber(queueNumber);
      } else if (isWalkIn) {
        const queueNumber = await checkIn({
          patient: selectedPatient,
          priority,
          isWalkIn: true,
        });
        setCompletedQueueNumber(queueNumber);
      } else {
        // Safety fallback: if no appointment is available, continue as walk-in.
        setIsWalkIn(true);
        const queueNumber = await checkIn({
          patient: selectedPatient,
          priority,
          isWalkIn: true,
        });
        setCompletedQueueNumber(queueNumber);
      }
      setStep('complete');
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const renderSearchStep = () => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, MRN, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isSearching && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No patients found</p>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {searchResults.map((patient) => {
            const hasAppointment = todayAppointments.some(
              (apt) => apt.patient_id === patient.id && apt.status === 'scheduled'
            );
            const eligibleForExpress = isEligibleForExpressCheckIn(patient as SelectedPatient);
            const patientAppointments = todayAppointments.filter(
              (apt) => apt.patient_id === patient.id && apt.status === 'scheduled'
            );

            return (
              <Card
                key={patient.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">
                        {patient.first_name} {patient.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        MRN: {patient.mrn} • DOB: {format(new Date(patient.date_of_birth), 'MMM d, yyyy')}
                      </p>
                      {eligibleForExpress && (
                        <Badge variant="success" className="mt-1 text-xs">
                          Express Check-In Eligible
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {eligibleForExpress && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            const appointment = patientAppointments.length === 1 ? patientAppointments[0] : undefined;
                            handleExpressCheckIn(patient as SelectedPatient, appointment);
                          }}
                          className="text-xs"
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          Express
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleSelectPatient(patient as SelectedPatient)}
                      >
                        Check-In
                      </Button>
                    </div>
                  </div>
                  {hasAppointment && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Has scheduled appointment today
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderVerifyStep = () => (
    <div className="space-y-6">
      {/* Patient Info */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                {selectedPatient?.first_name} {selectedPatient?.last_name}
              </h3>
              <p className="text-sm text-muted-foreground">MRN: {selectedPatient?.mrn}</p>
              <p className="text-sm text-muted-foreground">
                DOB: {selectedPatient?.date_of_birth && format(new Date(selectedPatient.date_of_birth), 'MMMM d, yyyy')}
              </p>
              {selectedPatient?.phone && (
                <p className="text-sm text-muted-foreground">Phone: {selectedPatient.phone}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Selection */}
      {patientAppointments.length > 0 && (
        <div className="space-y-2">
          <Label>Select Appointment</Label>
          <Select
            value={selectedAppointment?.id || ''}
            onValueChange={(value) => {
              const apt = patientAppointments.find((a) => a.id === value);
              setSelectedAppointment(apt || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select appointment..." />
            </SelectTrigger>
            <SelectContent>
              {patientAppointments.map((apt) => (
                <SelectItem key={apt.id} value={apt.id}>
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {apt.scheduled_time} - {apt.appointment_type}
                    {apt.doctor && ` with Dr. ${apt.doctor.last_name}`}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {patientAppointments.length === 0 && (
        <div className="flex items-center gap-2 p-4 bg-warning/10 rounded-lg border border-warning/20">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <div>
            <p className="font-medium">No scheduled appointment today</p>
            <p className="text-sm text-muted-foreground">Patient will be registered as a walk-in</p>
          </div>
        </div>
      )}

      {/* Walk-in option */}
      {patientAppointments.length === 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="walkIn"
              checked={isWalkIn}
              onCheckedChange={(checked) => setIsWalkIn(checked as boolean)}
            />
            <Label htmlFor="walkIn">Register as Walk-In</Label>
          </div>
          {isWalkIn && (
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <Separator />

      {/* Identity Verification */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Identity Verification
        </h4>

        {/* ID Scanning Options */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="text-xs">
            <User className="h-3 w-3 mr-1" />
            Scan Driver's License
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <CreditCard className="h-3 w-3 mr-1" />
            Scan Insurance Card
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="identityVerified"
            checked={identityVerified}
            onCheckedChange={(checked) => setIdentityVerified(checked as boolean)}
          />
          <Label htmlFor="identityVerified" className="text-sm">
            I have verified the patient's identity (Photo ID, DOB, or scanned document)
          </Label>
        </div>
      </div>
    </div>
  );

  const renderInsuranceStep = () => (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-4 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Insurance Information
          </h4>
          
          <div className="grid gap-4">
            <div>
              <Label className="text-muted-foreground text-sm">Provider</Label>
              <p className="font-medium">{selectedPatient?.insurance_provider || 'Not on file'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-sm">Policy Number</Label>
                <p className="font-medium">{selectedPatient?.insurance_policy_number || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Group Number</Label>
                <p className="font-medium">{selectedPatient?.insurance_group_number || 'N/A'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Checkbox
          id="insuranceVerified"
          checked={insuranceVerified}
          onCheckedChange={(checked) => setInsuranceVerified(checked as boolean)}
        />
        <Label htmlFor="insuranceVerified" className="text-sm">
          Insurance information verified and up to date
        </Label>
      </div>
    </div>
  );

  const renderCopayStep = () => (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-4 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Co-Pay Collection
          </h4>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="copayAmount">Co-Pay Amount ({CURRENCY_SYMBOL})</Label>
              <Input
                id="copayAmount"
                type="number"
                placeholder="0.00"
                value={copayAmount}
                onChange={(e) => setCopayAmount(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="copayCollected"
                checked={copayCollected}
                onCheckedChange={(checked) => setCopayCollected(checked as boolean)}
              />
              <Label htmlFor="copayCollected" className="text-sm">
                {copayAmount ? `Co-pay of ${CURRENCY_SYMBOL}${copayAmount} collected` : 'No co-pay required / Skip'}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2">Check-In Summary</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Patient: {selectedPatient?.first_name} {selectedPatient?.last_name}</li>
          <li>• {selectedAppointment ? `Appointment: ${selectedAppointment.scheduled_time}` : 'Walk-In Registration'}</li>
          <li>• Insurance: {insuranceVerified ? 'Verified' : 'Not Verified'}</li>
          <li>• Co-Pay: {copayCollected ? `${CURRENCY_SYMBOL}${copayAmount}` : 'None'}</li>
        </ul>
      </div>
    </div>
  );

  const renderExpressStep = () => (
    <div className="text-center py-8 space-y-4">
      <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
        <Zap className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Express Check-In</h3>
        <p className="text-muted-foreground">
          Confirm details for {selectedPatient?.first_name} {selectedPatient?.last_name}
        </p>
      </div>

      <Card className="max-w-sm mx-auto">
        <CardContent className="pt-4 space-y-3">
          <div className="text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Patient:</span>
              <span className="text-sm font-medium">{selectedPatient?.first_name} {selectedPatient?.last_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Insurance:</span>
              <span className="text-sm font-medium">{selectedPatient?.insurance_provider || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Appointment:</span>
              <span className="text-sm font-medium">
                {selectedAppointment ? selectedAppointment.scheduled_time : 'Walk-In'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-center">
        <Checkbox
          id="sendSmsExpress"
          checked={sendSmsConfirmation}
          onCheckedChange={(checked) => setSendSmsConfirmation(checked as boolean)}
        />
        <Label htmlFor="sendSmsExpress" className="text-sm">Send SMS confirmation</Label>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center py-8 space-y-4">
      <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-8 w-8 text-success" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Check-In Complete!</h3>
        <p className="text-muted-foreground">
          {selectedPatient?.first_name} {selectedPatient?.last_name} has been added to the queue.
        </p>
      </div>
      {completedQueueNumber && (
        <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
          <span className="text-sm text-muted-foreground">Queue Number:</span>
          <span className="text-2xl font-bold text-primary">#{completedQueueNumber}</span>
        </div>
      )}

      {/* Notification Options */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium">Send Confirmation</h4>
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sms-confirmation"
              checked={sendSmsConfirmation}
              onCheckedChange={(c) => setSendSmsConfirmation(c === true)}
            />
            <Label htmlFor="sms-confirmation" className="text-sm">
              SMS ({selectedPatient?.phone})
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="email-confirmation"
              checked={sendEmailConfirmation}
              onCheckedChange={(c) => setSendEmailConfirmation(c === true)}
            />
            <Label htmlFor="email-confirmation" className="text-sm">
              Email
            </Label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Estimated wait time: ~15-20 minutes
        </p>
      </div>
    </div>
  );

  const getStepTitle = () => {
    switch (step) {
      case 'search':
        return 'Find Patient';
      case 'verify':
        return 'Verify Patient';
      case 'insurance':
        return 'Insurance Verification';
      case 'copay':
        return 'Co-Pay Collection';
      case 'express':
        return 'Express Check-In';
      case 'complete':
        return 'Check-In Complete';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {getStepTitle()}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        {step !== 'complete' && step !== 'express' && (
          <div className="flex items-center gap-1 mb-4">
            {(['search', 'verify', 'insurance', 'copay'] as CheckInStep[]).map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full ${
                  ['search', 'verify', 'insurance', 'copay'].indexOf(step) >= i
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        )}

        {step === 'search' && renderSearchStep()}
        {step === 'verify' && renderVerifyStep()}
        {step === 'insurance' && renderInsuranceStep()}
        {step === 'copay' && renderCopayStep()}
        {step === 'express' && renderExpressStep()}
        {step === 'complete' && renderCompleteStep()}

        <DialogFooter>
          {step === 'search' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          {step !== 'search' && step !== 'complete' && (
            <div className="flex w-full justify-between items-center">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-muted-foreground">
                Cancel
              </Button>
              <div className="flex gap-2">
                {step !== 'express' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const steps: CheckInStep[] = ['search', 'verify', 'insurance', 'copay'];
                      const currentIndex = steps.indexOf(step);
                      if (currentIndex > 0) {
                        setStep(steps[currentIndex - 1]);
                      }
                    }}
                  >
                    Back
                  </Button>
                )}
                {step === 'verify' && (
                  <Button onClick={handleVerifyIdentity} disabled={!identityVerified}>
                    Continue
                  </Button>
                )}
                {step === 'insurance' && (
                  <Button onClick={handleVerifyInsurance}>
                    Continue
                  </Button>
                )}
                {step === 'copay' && (
                  <Button
                    onClick={handleCompleteCheckIn}
                    disabled={isPending}
                  >
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Complete Check-In
                  </Button>
                )}
                {step === 'express' && (
                  <Button
                    onClick={handleCompleteCheckIn}
                    disabled={isPending}
                  >
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Confirm Express Check-In
                  </Button>
                )}
              </div>
            </div>
          )}
          {step === 'complete' && (
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
