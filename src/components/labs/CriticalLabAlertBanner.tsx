// ===================================================================
// TIER 4.4: Critical Lab Alert Banner & Card Components
// ===================================================================
// Purpose: Prominent alert for critical values with escalation chain
// File: src/components/labs/CriticalLabAlertBanner.tsx
// ===================================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, CheckCircle2, Clock, X, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CriticalLabAlert } from '@/hooks/useCriticalLabAlerts';

interface CriticalLabAlertBannerProps {
  alert: CriticalLabAlert;
  onAcknowledge: (notes?: string) => void;
  onResolve: (notes: string) => void;
  isLoading?: boolean;
}

export function CriticalLabAlertBanner({
  alert,
  onAcknowledge,
  onResolve,
  isLoading = false,
}: CriticalLabAlertBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [resolveMode, setResolveMode] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');

  const getSeverityColor = () => {
    if (alert.severity === 'critical_high' || alert.severity === 'critical_low') {
      return 'bg-red-100 border-red-500 text-red-900';
    }
    return 'bg-yellow-100 border-yellow-500 text-yellow-900';
  };

  const getSeverityIcon = () => {
    if (alert.severity === 'critical_high' || alert.severity === 'critical_low') {
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
    return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
  };

  const getEscalationBadges = () => {
    const badges = [];
    
    if (alert.primary_acknowledged_at) {
      badges.push(
        <Badge key="primary" variant="outline" className="bg-green-50">
          ✓ Primary: {new Date(alert.primary_acknowledged_at).toLocaleTimeString()}
        </Badge>
      );
    } else if (alert.primary_notified_at) {
      badges.push(
        <Badge key="primary" variant="outline" className="bg-yellow-50">
          ⏳ Primary: {new Date(alert.primary_notified_at).toLocaleTimeString()}
        </Badge>
      );
    }

    if (alert.on_call_acknowledged_at) {
      badges.push(
        <Badge key="on-call" variant="outline" className="bg-green-50">
          ✓ On-Call: {new Date(alert.on_call_acknowledged_at).toLocaleTimeString()}
        </Badge>
      );
    } else if (alert.on_call_notified_at) {
      badges.push(
        <Badge key="on-call" variant="outline" className="bg-yellow-50">
          ⏳ On-Call: {new Date(alert.on_call_notified_at).toLocaleTimeString()}
        </Badge>
      );
    }

    if (alert.er_acknowledged_at) {
      badges.push(
        <Badge key="er" variant="outline" className="bg-green-50">
          ✓ ER: {new Date(alert.er_acknowledged_at).toLocaleTimeString()}
        </Badge>
      );
    } else if (alert.er_notified_at) {
      badges.push(
        <Badge key="er" variant="outline" className="bg-orange-50">
          ⏳ ER: {new Date(alert.er_notified_at).toLocaleTimeString()}
        </Badge>
      );
    }

    return badges;
  };

  return (
    <Card className={`border-2 ${getSeverityColor()}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getSeverityIcon()}
            <div>
              <CardTitle className="text-lg">
                {alert.severity === 'critical_high' && '🔴 CRITICAL HIGH: '}
                {alert.severity === 'critical_low' && '🟠 CRITICAL LOW: '}
                {alert.severity === 'warning' && '🟡 WARNING: '}
                {alert.test_name}
              </CardTitle>
              <p className="text-sm font-mono mt-1">
                Value: {alert.result_value} | Created: {new Date(alert.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronDown className={`w-5 h-5 transition ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Escalation Chain */}
        <div className="flex flex-wrap gap-2">
          {getEscalationBadges()}
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t">
            {/* Timeline */}
            <div className="space-y-2 text-sm">
              <p className="font-medium">Escalation Timeline:</p>
              <div className="ml-4 space-y-1">
                <div className="flex items-center gap-2">
                  {alert.primary_acknowledged_at && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  {!alert.primary_acknowledged_at && <Clock className="w-4 h-4 text-red-400" />}
                  <span>Primary Doctor: {alert.primary_notified_at ? new Date(alert.primary_notified_at).toLocaleTimeString() : 'Not notified'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {alert.on_call_acknowledged_at && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  {alert.on_call_notified_at && !alert.on_call_acknowledged_at && <Clock className="w-4 h-4 text-orange-400" />}
                  {!alert.on_call_notified_at && <Clock className="w-4 h-4 text-gray-300" />}
                  <span>On-Call: {alert.on_call_notified_at ? new Date(alert.on_call_notified_at).toLocaleTimeString() : 'Pending 5min'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {alert.er_acknowledged_at && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  {alert.er_notified_at && !alert.er_acknowledged_at && <Clock className="w-4 h-4 text-orange-400" />}
                  {!alert.er_notified_at && <Clock className="w-4 h-4 text-gray-300" />}
                  <span>ER: {alert.er_notified_at ? new Date(alert.er_notified_at).toLocaleTimeString() : 'Pending 10min'}</span>
                </div>
              </div>
            </div>

            {/* Action Notes */}
            {alert.primary_action_notes && (
              <div className="p-2 bg-white rounded border">
                <p className="text-xs font-medium text-gray-600">Primary Doctor Action:</p>
                <p className="text-sm">{alert.primary_action_notes}</p>
              </div>
            )}
            {alert.on_call_action_notes && (
              <div className="p-2 bg-white rounded border">
                <p className="text-xs font-medium text-gray-600">On-Call Action:</p>
                <p className="text-sm">{alert.on_call_action_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {!alert.primary_acknowledged_at && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onAcknowledge()}
              disabled={isLoading}
            >
              ✓ Acknowledge
            </Button>
          )}
          
          {alert.primary_acknowledged_at && !alert.is_resolved && (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  Mark Resolved
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Resolve Critical Lab Alert</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm">Document resolution for this critical value:</p>
                  <Textarea
                    placeholder="E.g., Follow-up K+ level 4.2 (normal), Patient stabilized, Transferred to floor..."
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        onResolve(resolveNotes);
                        setResolveNotes('');
                      }}
                      disabled={!resolveNotes.trim() || isLoading}
                    >
                      ✓ Resolve Alert
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
