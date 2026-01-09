import { AlertTriangle, Phone, Mail, CheckCircle2, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface CriticalResultNotificationProps {
  criticalResult: {
    id: string;
    patient_name: string;
    patient_mrn: string;
    test_name: string;
    result_value: string;
    reference_range: string;
    ordering_doctor: string;
    doctor_phone?: string;
    result_time: string;
  };
  onNotificationSent: (method: string, notes: string) => void;
  onAcknowledge: () => void;
}

export function CriticalResultNotification({
  criticalResult,
  onNotificationSent,
  onAcknowledge,
}: CriticalResultNotificationProps) {
  const [notificationNotes, setNotificationNotes] = useState('');
  const [notificationSent, setNotificationSent] = useState(false);

  const handleNotify = (method: 'phone' | 'email') => {
    if (!notificationNotes.trim()) {
      return;
    }
    
    onNotificationSent(method, notificationNotes.trim());
    setNotificationSent(true);
  };

  const handleAcknowledge = () => {
    onAcknowledge();
    setNotificationNotes('');
    setNotificationSent(false);
  };

  return (
    <Alert className="border-destructive bg-destructive/10">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-destructive">Critical Result - Immediate Notification Required</h4>
            <Badge variant="destructive">CRITICAL</Badge>
          </div>

          {/* Patient and Test Information */}
          <div className="bg-background rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Patient:</span>
                <p className="font-medium">{criticalResult.patient_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">MRN:</span>
                <p className="font-medium">{criticalResult.patient_mrn}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Test:</span>
                <p className="font-medium">{criticalResult.test_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Result:</span>
                <p className="font-medium text-destructive">{criticalResult.result_value}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Normal Range:</span>
                <p className="font-medium">{criticalResult.reference_range}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Ordering Doctor:</span>
                <p className="font-medium">{criticalResult.ordering_doctor}</p>
              </div>
            </div>
          </div>

          {/* Notification Actions */}
          {!notificationSent ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Notification Details *</Label>
                <Textarea
                  placeholder="Record how you notified the doctor (time, method, person contacted, acknowledgment received)..."
                  value={notificationNotes}
                  onChange={(e) => setNotificationNotes(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleNotify('phone')}
                  disabled={!notificationNotes.trim()}
                  className="flex-1"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Called Doctor
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNotify('email')}
                  disabled={!notificationNotes.trim()}
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Sent Message
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Notification Sent</span>
                <Badge variant="success">Documented</Badge>
              </div>
              
              <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                <p className="text-sm">{notificationNotes}</p>
              </div>

              <Button
                onClick={handleAcknowledge}
                className="w-full"
                variant="outline"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Acknowledge & Close Alert
              </Button>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Result Time: {new Date(criticalResult.result_time).toLocaleString()}</span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}