import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Search,
  User,
  Calendar as CalendarIcon,
  CreditCard,
  FileText,
  CheckCircle2,
  Loader2,
  Receipt,
  Clock,
} from 'lucide-react';
import { useActiveQueue, useCompleteService, QueueEntry } from '@/hooks/useQueue';
import { useInvoices } from '@/hooks/useBilling';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PatientCheckOutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queueEntry?: QueueEntry | null;
}

type CheckOutStep = 'summary' | 'billing' | 'payment' | 'followup' | 'complete';

export function PatientCheckOutModal({ open, onOpenChange, queueEntry }: PatientCheckOutModalProps) {
  const [step, setStep] = useState<CheckOutStep>('summary');
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [needsFollowUp, setNeedsFollowUp] = useState(false);

  const { data: inServiceQueue = [] } = useActiveQueue();
  const completeService = useCompleteService();

  const inServicePatients = inServiceQueue.filter(q => q.status === 'in_service');

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('summary');
      setSelectedEntry(null);
      setPaymentMethod('cash');
      setPaymentAmount('');
      setFollowUpDate(undefined);
      setFollowUpNotes('');
      setNeedsFollowUp(false);
    } else if (queueEntry) {
      setSelectedEntry(queueEntry);
    }
  }, [open, queueEntry]);

  const handleSelectPatient = (entry: QueueEntry) => {
    setSelectedEntry(entry);
    setStep('summary');
  };

  const handleCompleteCheckOut = async () => {
    if (!selectedEntry) return;

    try {
      await completeService.mutateAsync(selectedEntry.id);
      setStep('complete');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const renderPatientSelection = () => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Select a patient currently in service to check out:
      </div>
      
      {inServicePatients.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No patients currently in service</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {inServicePatients.map((entry) => (
            <Card
              key={entry.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleSelectPatient(entry)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center font-bold text-success">
                      #{entry.queue_number}
                    </div>
                    <div>
                      <p className="font-medium">
                        {entry.patient?.first_name} {entry.patient?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        MRN: {entry.patient?.mrn}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">In Service</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderSummaryStep = () => (
    <div className="space-y-6">
      {/* Patient Info */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                {selectedEntry?.patient?.first_name} {selectedEntry?.patient?.last_name}
              </h3>
              <p className="text-sm text-muted-foreground">MRN: {selectedEntry?.patient?.mrn}</p>
              <p className="text-sm text-muted-foreground">Queue #: {selectedEntry?.queue_number}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visit Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Visit Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Check-in Time:</span>
            <span>{selectedEntry?.check_in_time && format(new Date(selectedEntry.check_in_time), 'h:mm a')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service Start:</span>
            <span>{selectedEntry?.service_start_time && format(new Date(selectedEntry.service_start_time), 'h:mm a')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Department:</span>
            <span>{selectedEntry?.department || 'General'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderBillingStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Billing Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Estimated Charges</p>
            <p className="text-2xl font-bold">$0.00</p>
            <p className="text-xs text-muted-foreground mt-1">
              Invoice will be generated after consultation notes are finalized
            </p>
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consultation Fee:</span>
              <span>Pending</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lab Tests:</span>
              <span>Pending</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Medications:</span>
              <span>Pending</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        A detailed invoice will be sent to the billing department for processing.
      </p>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Collection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Payment Amount ($)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
          </div>

          <div>
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
                <SelectItem value="insurance">Insurance</SelectItem>
                <SelectItem value="check">Check</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Leave amount empty if no payment is being collected at this time.
      </p>
    </div>
  );

  const renderFollowUpStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Follow-Up Scheduling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant={needsFollowUp ? "default" : "outline"}
              size="sm"
              onClick={() => setNeedsFollowUp(true)}
            >
              Schedule Follow-Up
            </Button>
            <Button
              variant={!needsFollowUp ? "default" : "outline"}
              size="sm"
              onClick={() => setNeedsFollowUp(false)}
            >
              No Follow-Up Needed
            </Button>
          </div>

          {needsFollowUp && (
            <>
              <div className="space-y-2">
                <Label>Follow-Up Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !followUpDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {followUpDate ? format(followUpDate, 'PPP') : 'Select date...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={followUpDate}
                      onSelect={setFollowUpDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[7, 14, 30, 90].map((days) => (
                  <Button
                    key={days}
                    variant="outline"
                    size="sm"
                    onClick={() => setFollowUpDate(addDays(new Date(), days))}
                  >
                    {days === 7 ? '1 Week' : days === 14 ? '2 Weeks' : days === 30 ? '1 Month' : '3 Months'}
                  </Button>
                ))}
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Follow-up reason or instructions..."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center py-8 space-y-4">
      <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-8 w-8 text-success" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Check-Out Complete!</h3>
        <p className="text-muted-foreground">
          {selectedEntry?.patient?.first_name} {selectedEntry?.patient?.last_name} has been checked out.
        </p>
      </div>
      {needsFollowUp && followUpDate && (
        <div className="p-4 bg-muted/50 rounded-lg text-sm">
          <p className="font-medium">Follow-Up Scheduled</p>
          <p className="text-muted-foreground">{format(followUpDate, 'PPPP')}</p>
        </div>
      )}
    </div>
  );

  const getStepTitle = () => {
    if (!selectedEntry && step !== 'complete') return 'Select Patient';
    switch (step) {
      case 'summary':
        return 'Visit Summary';
      case 'billing':
        return 'Billing';
      case 'payment':
        return 'Payment';
      case 'followup':
        return 'Follow-Up';
      case 'complete':
        return 'Check-Out Complete';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {getStepTitle()}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        {step !== 'complete' && selectedEntry && (
          <div className="flex items-center gap-1 mb-4">
            {(['summary', 'billing', 'payment', 'followup'] as CheckOutStep[]).map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full ${
                  ['summary', 'billing', 'payment', 'followup'].indexOf(step) >= i
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        )}

        {!selectedEntry && step !== 'complete' ? (
          renderPatientSelection()
        ) : (
          <>
            {step === 'summary' && renderSummaryStep()}
            {step === 'billing' && renderBillingStep()}
            {step === 'payment' && renderPaymentStep()}
            {step === 'followup' && renderFollowUpStep()}
            {step === 'complete' && renderCompleteStep()}
          </>
        )}

        <DialogFooter>
          {selectedEntry && step !== 'summary' && step !== 'complete' && (
            <Button
              variant="outline"
              onClick={() => {
                const steps: CheckOutStep[] = ['summary', 'billing', 'payment', 'followup'];
                const currentIndex = steps.indexOf(step);
                if (currentIndex > 0) {
                  setStep(steps[currentIndex - 1]);
                }
              }}
            >
              Back
            </Button>
          )}
          {selectedEntry && step === 'summary' && (
            <Button onClick={() => setStep('billing')}>
              Continue
            </Button>
          )}
          {step === 'billing' && (
            <Button onClick={() => setStep('payment')}>
              Continue
            </Button>
          )}
          {step === 'payment' && (
            <Button onClick={() => setStep('followup')}>
              Continue
            </Button>
          )}
          {step === 'followup' && (
            <Button
              onClick={handleCompleteCheckOut}
              disabled={completeService.isPending}
            >
              {completeService.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Complete Check-Out
            </Button>
          )}
          {step === 'complete' && (
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
