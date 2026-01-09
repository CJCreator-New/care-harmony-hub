import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TestTube, User, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface SampleCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labOrder: {
    id: string;
    patient_name: string;
    patient_mrn: string;
    test_name: string;
    sample_type: string;
    priority: string;
    ordered_at: string;
  } | null;
  onCollectSample: (data: {
    sampleId: string;
    collectionTime: string;
    patientVerified: boolean;
    sampleQuality: string;
    notes: string;
  }) => void;
  isLoading?: boolean;
}

export function SampleCollectionModal({
  open,
  onOpenChange,
  labOrder,
  onCollectSample,
  isLoading = false,
}: SampleCollectionModalProps) {
  const [sampleId, setSampleId] = useState('');
  const [patientVerified, setPatientVerified] = useState(false);
  const [sampleQuality, setSampleQuality] = useState('good');
  const [notes, setNotes] = useState('');

  const generateSampleId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `S${timestamp}${random}`;
  };

  const handleGenerateId = () => {
    setSampleId(generateSampleId());
  };

  const handleCollect = () => {
    if (!patientVerified) {
      toast.error('Please verify patient identity');
      return;
    }
    if (!sampleId.trim()) {
      toast.error('Please enter or generate sample ID');
      return;
    }

    onCollectSample({
      sampleId: sampleId.trim(),
      collectionTime: new Date().toISOString(),
      patientVerified,
      sampleQuality,
      notes: notes.trim(),
    });

    // Reset form
    setSampleId('');
    setPatientVerified(false);
    setSampleQuality('good');
    setNotes('');
  };

  if (!labOrder) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'destructive';
      case 'high': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-primary" />
            Collect Sample
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Information */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4" />
              <h3 className="font-medium">Collection Details</h3>
              <Badge variant={getPriorityColor(labOrder.priority)}>
                {labOrder.priority.toUpperCase()}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patient:</span>
                <span className="font-medium">{labOrder.patient_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">MRN:</span>
                <span className="font-medium">{labOrder.patient_mrn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Test:</span>
                <span className="font-medium">{labOrder.test_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sample Type:</span>
                <span className="font-medium">{labOrder.sample_type}</span>
              </div>
            </div>
          </div>

          {/* Patient Verification */}
          <div className="space-y-3">
            <h3 className="font-medium">Patient Verification</h3>
            <div className="flex items-center gap-3">
              <Checkbox
                id="patientVerified"
                checked={patientVerified}
                onCheckedChange={(checked) => setPatientVerified(checked === true)}
              />
              <Label htmlFor="patientVerified" className="cursor-pointer">
                Patient identity verified (ID checked, name and DOB confirmed)
              </Label>
            </div>
          </div>

          {/* Sample ID */}
          <div className="space-y-2">
            <Label htmlFor="sampleId">Sample ID *</Label>
            <div className="flex gap-2">
              <Input
                id="sampleId"
                placeholder="Enter or generate sample ID..."
                value={sampleId}
                onChange={(e) => setSampleId(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateId}
                className="whitespace-nowrap"
              >
                Generate ID
              </Button>
            </div>
          </div>

          {/* Sample Quality */}
          <div className="space-y-2">
            <Label htmlFor="quality">Sample Quality</Label>
            <select
              id="quality"
              value={sampleQuality}
              onChange={(e) => setSampleQuality(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="good">Good Quality</option>
              <option value="acceptable">Acceptable</option>
              <option value="poor">Poor Quality</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Collection Time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Collection Time: {new Date().toLocaleString()}</span>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Collection Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any issues during collection, patient condition, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCollect} 
            disabled={isLoading || !patientVerified || sampleQuality === 'rejected'}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirm Collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}