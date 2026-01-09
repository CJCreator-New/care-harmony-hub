import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Pill } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PrescriptionRefillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription?: {
    id: string;
    medication_name: string;
    dosage: string;
    frequency: string;
    refills_remaining?: number;
    last_filled?: string;
  };
}

export function PrescriptionRefillModal({ 
  open, 
  onOpenChange, 
  prescription 
}: PrescriptionRefillModalProps) {
  const [reason, setReason] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [acknowledgeInstructions, setAcknowledgeInstructions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const canRefill = prescription?.refills_remaining && prescription.refills_remaining > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acknowledgeInstructions) {
      toast({
        title: "Acknowledgment Required",
        description: "Please acknowledge that you understand the refill instructions.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement refill request submission
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Refill Requested",
        description: `Your refill request for ${prescription?.medication_name} has been submitted for review.`,
      });
      
      setReason('');
      setIsUrgent(false);
      setAcknowledgeInstructions(false);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit refill request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!prescription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Request Prescription Refill
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Prescription Details */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold">{prescription.medication_name}</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><span className="font-medium">Dosage:</span> {prescription.dosage}</p>
              <p><span className="font-medium">Frequency:</span> {prescription.frequency}</p>
              {prescription.refills_remaining !== undefined && (
                <p>
                  <span className="font-medium">Refills Remaining:</span>{' '}
                  <Badge variant={canRefill ? "default" : "destructive"}>
                    {prescription.refills_remaining}
                  </Badge>
                </p>
              )}
              {prescription.last_filled && (
                <p><span className="font-medium">Last Filled:</span> {prescription.last_filled}</p>
              )}
            </div>
          </div>

          {/* Refill Eligibility Check */}
          {!canRefill && (
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-semibold text-destructive">No Refills Remaining</h4>
                  <p className="text-sm text-destructive/80 mt-1">
                    This prescription has no remaining refills. You may still submit a request, 
                    but it will require doctor approval for a new prescription.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Refill Request</Label>
              <Textarea
                id="reason"
                placeholder="Optional: Provide any additional information about your refill request..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="urgent"
                checked={isUrgent}
                onCheckedChange={(checked) => setIsUrgent(checked as boolean)}
              />
              <Label htmlFor="urgent" className="text-sm">
                This is an urgent request (medication running low)
              </Label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="acknowledge"
                checked={acknowledgeInstructions}
                onCheckedChange={(checked) => setAcknowledgeInstructions(checked as boolean)}
              />
              <Label htmlFor="acknowledge" className="text-sm leading-relaxed">
                I understand that this refill request will be reviewed by my healthcare provider 
                and may take 1-2 business days to process. I confirm that I am taking this 
                medication as prescribed.
              </Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !acknowledgeInstructions}
              >
                {isSubmitting ? "Submitting..." : "Request Refill"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}