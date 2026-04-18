// ===================================================================
// TIER 4.2: Lab Result Notification Card Component
// ===================================================================
// Purpose: Display lab notification with acknowledge/action controls
// File: src/components/labs/LabResultNotificationCard.tsx
// ===================================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { LabNotification } from '@/hooks/useLabNotifications';

interface LabResultNotificationCardProps {
  notification: LabNotification;
  onAcknowledge: () => void;
  onRecordAction: (notes: string) => void;
  onCancel?: (reason: string) => void;
  isLoading?: boolean;
}

export function LabResultNotificationCard({
  notification,
  onAcknowledge,
  onRecordAction,
  onCancel,
  isLoading = false,
}: LabResultNotificationCardProps) {
  const [actionMode, setActionMode] = useState<'view' | 'acknowledge' | 'action'>('view');
  const [actionNotes, setActionNotes] = useState('');

  const getStatusBadge = () => {
    switch (notification.status) {
      case 'pending':
        return <Badge variant="destructive">⏳ Pending</Badge>;
      case 'notified':
        return <Badge variant="outline">📢 Notified</Badge>;
      case 'acknowledged':
        return <Badge variant="secondary">✓ Acknowledged</Badge>;
      case 'acted_upon':
        return <Badge variant="outline" className="bg-green-50">✓✓ Acted</Badge>;
      default:
        return null;
    }
  };

  const getCriticalIndicator = () => {
    if (!notification.is_critical) return null;
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border-l-4 border-red-500 rounded">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <div>
          <p className="text-sm font-semibold text-red-900">🚨 CRITICAL VALUE</p>
          <p className="text-xs text-red-700">Requires immediate clinical review</p>
        </div>
      </div>
    );
  };

  return (
    <Card className={notification.is_critical ? 'border-red-300 bg-red-50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{notification.test_name}</CardTitle>
            <p className="text-sm text-gray-600">
              Patient ID: {notification.patient_id.substring(0, 8)}...
            </p>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {getCriticalIndicator()}

        {/* Lab Result Details */}
        <div className="bg-white rounded p-3 space-y-2 border">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Result Value:</span>
            <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
              {notification.result_value} {notification.unit}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Reported at:</span>
            <span>{new Date(notification.created_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {notification.notified_at && <CheckCircle2 className="w-4 h-4 text-green-600" />}
            {!notification.notified_at && <Clock className="w-4 h-4 text-gray-400" />}
            <span>Notified: {notification.notified_at ? new Date(notification.notified_at).toLocaleTimeString() : 'Pending'}</span>
          </div>
          <div className="flex items-center gap-2">
            {notification.acknowledged_at && <CheckCircle2 className="w-4 h-4 text-green-600" />}
            {!notification.acknowledged_at && <Clock className="w-4 h-4 text-gray-400" />}
            <span>Acknowledged: {notification.acknowledged_at ? new Date(notification.acknowledged_at).toLocaleTimeString() : 'Pending'}</span>
          </div>
        </div>

        {/* Actions */}
        {actionMode === 'view' && (
          <div className="flex gap-2 pt-4">
            {notification.status === 'notified' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionMode('acknowledge')}
                disabled={isLoading}
              >
                ✓ Acknowledge
              </Button>
            )}
            {notification.status === 'acknowledged' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setActionMode('action')}
                disabled={isLoading}
              >
                Record Action
              </Button>
            )}
            {notification.status === 'pending' || notification.status === 'notified' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActionMode('view')}
                disabled={isLoading}
              >
                Dismiss
              </Button>
            )}
          </div>
        )}

        {/* Acknowledge Mode */}
        {actionMode === 'acknowledge' && (
          <div className="space-y-3 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm font-medium">Acknowledge notification?</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  onAcknowledge();
                  setActionMode('view');
                }}
                disabled={isLoading}
              >
                ✓ Yes, Acknowledge
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionMode('view')}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action Mode */}
        {actionMode === 'action' && (
          <div className="space-y-3 p-3 bg-green-50 rounded border border-green-200">
            <p className="text-sm font-medium">Record action taken:</p>
            <Textarea
              placeholder="E.g., Started IV fluids, Ordered follow-up K+ level, Patient transferred to ICU..."
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              className="min-h-[80px]"
              disabled={isLoading}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  onRecordAction(actionNotes);
                  setActionNotes('');
                  setActionMode('view');
                }}
                disabled={isLoading || !actionNotes.trim()}
              >
                ✓ Record & Consent Log
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActionNotes('');
                  setActionMode('view');
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
