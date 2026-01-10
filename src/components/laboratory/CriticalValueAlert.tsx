import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Phone, 
  Clock, 
  CheckCircle, 
  User, 
  Stethoscope,
  Bell,
  MessageSquare
} from 'lucide-react';
import { CriticalValueNotification, LabResult } from '@/types/laboratory';
import { format, differenceInMinutes } from 'date-fns';

interface CriticalValueAlertProps {
  notification: CriticalValueNotification;
  labResult: LabResult;
  patientName: string;
  onAcknowledge: (notificationId: string, notes?: string) => void;
  onEscalate: (notificationId: string) => void;
  onReadBack: (notificationId: string, readBackText: string) => void;
}

export const CriticalValueAlert: React.FC<CriticalValueAlertProps> = ({
  notification,
  labResult,
  patientName,
  onAcknowledge,
  onEscalate,
  onReadBack
}) => {
  const [acknowledgmentNotes, setAcknowledmentNotes] = useState('');
  const [readBackText, setReadBackText] = useState('');
  const [showReadBack, setShowReadBack] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const getSeverityColor = (level: number) => {
    switch (level) {
      case 3: return 'bg-red-100 text-red-800 border-red-200';
      case 2: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 1: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityLabel = (level: number) => {
    switch (level) {
      case 3: return 'CRITICAL';
      case 2: return 'URGENT';
      case 1: return 'ROUTINE';
      default: return 'UNKNOWN';
    }
  };

  const getEscalationTimeout = (level: number) => {
    switch (level) {
      case 3: return 15; // 15 minutes for critical
      case 2: return 30; // 30 minutes for urgent
      case 1: return 60; // 60 minutes for routine
      default: return 30;
    }
  };

  const handleAcknowledge = () => {
    if (notification.notification_level === 3 && !notification.read_back_verified) {
      setShowReadBack(true);
    } else {
      onAcknowledge(notification.id, acknowledgmentNotes);
    }
  };

  const handleReadBackSubmit = () => {
    onReadBack(notification.id, readBackText);
    onAcknowledge(notification.id, acknowledgmentNotes);
  };

  const isOverdue = () => {
    const timeoutMinutes = getEscalationTimeout(notification.notification_level);
    return timeElapsed > timeoutMinutes;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = differenceInMinutes(new Date(), new Date(notification.notified_at));
      setTimeElapsed(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [notification.notified_at]);

  if (notification.acknowledged_at) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">
              Critical value acknowledged at {format(new Date(notification.acknowledged_at), 'HH:mm')}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${isOverdue() ? 'border-red-500 bg-red-50' : 'border-orange-500 bg-orange-50'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Critical Lab Value Alert
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getSeverityColor(notification.notification_level)}>
              {getSeverityLabel(notification.notification_level)}
            </Badge>
            {isOverdue() && (
              <Badge variant="destructive" className="animate-pulse">
                OVERDUE
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Patient and Test Information */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded-lg border">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-gray-600" />
              <span className="font-medium">Patient</span>
            </div>
            <p className="text-lg font-semibold">{patientName}</p>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="h-4 w-4 text-gray-600" />
              <span className="font-medium">Test</span>
            </div>
            <p className="font-semibold">{labResult.loinc_code || 'Lab Test'}</p>
          </div>
        </div>

        {/* Critical Value Details */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Critical Value:</span>
                <span className="text-lg font-bold">{notification.critical_value}</span>
              </div>
              
              {labResult.reference_range && (
                <div className="flex justify-between items-center text-sm">
                  <span>Reference Range:</span>
                  <span>{labResult.reference_range}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center text-sm">
                <span>Result Time:</span>
                <span>{format(new Date(labResult.performed_at), 'MMM dd, HH:mm')}</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Timing Information */}
        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium">Time Elapsed:</span>
          </div>
          <div className="text-right">
            <span className={`font-bold ${isOverdue() ? 'text-red-600' : 'text-yellow-600'}`}>
              {timeElapsed} minutes
            </span>
            <p className="text-xs text-gray-600">
              Timeout: {getEscalationTimeout(notification.notification_level)} min
            </p>
          </div>
        </div>

        {/* Escalation Warning */}
        {isOverdue() && (
          <Alert variant="destructive">
            <Bell className="h-4 w-4" />
            <AlertDescription>
              <strong>Escalation Required:</strong> This critical value has not been acknowledged 
              within the required timeframe. Automatic escalation will occur.
            </AlertDescription>
          </Alert>
        )}

        {/* Read-back Verification (for Critical Level 3) */}
        {showReadBack && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Read-back Verification Required
            </h4>
            <p className="text-sm text-gray-700 mb-3">
              Please repeat the critical value to confirm accurate communication:
            </p>
            <Textarea
              value={readBackText}
              onChange={(e) => setReadBackText(e.target.value)}
              placeholder="Repeat the critical value exactly as communicated..."
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleReadBackSubmit}
                disabled={!readBackText.trim()}
                size="sm"
              >
                Confirm Read-back
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowReadBack(false)}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Acknowledgment Notes */}
        {!showReadBack && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Acknowledgment Notes (Optional)
            </label>
            <Textarea
              value={acknowledgmentNotes}
              onChange={(e) => setAcknowledmentNotes(e.target.value)}
              placeholder="Enter any notes about actions taken or clinical context..."
              rows={3}
            />
          </div>
        )}

        {/* Action Buttons */}
        {!showReadBack && (
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={handleAcknowledge}
              className="flex-1"
              size="lg"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Acknowledge Critical Value
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onEscalate(notification.id)}
              size="lg"
            >
              <Phone className="h-4 w-4 mr-2" />
              Escalate Now
            </Button>
          </div>
        )}

        {/* Escalation History */}
        {notification.escalation_level > 0 && (
          <div className="p-3 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-sm mb-2">Escalation History</h4>
            <div className="text-sm text-gray-600">
              <p>Escalation Level: {notification.escalation_level}</p>
              {notification.escalated_at && (
                <p>Last Escalated: {format(new Date(notification.escalated_at), 'MMM dd, HH:mm')}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};