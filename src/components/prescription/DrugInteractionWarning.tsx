/**
 * Component: DrugInteractionWarning (Tier 4.5 - Phase 4)
 *
 * Purpose: Display drug interaction warnings with severity styling
 * Pattern: Used in prescription form when pharmacist adds medication
 *
 * Props:
 * - severity: interaction severity level
 * - interactions: array of detected interactions
 * - onRequestDoctorApproval: callback when user clicks "Request Approval"
 * - isDoctorApprovalPending: show loading state while waiting for doctor
 */

import React from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Badge,
} from '@/components/ui/badge';
import {
  Button,
} from '@/components/ui/button';
import {
  Card,
} from '@/components/ui/card';

interface Interaction {
  interactingDrug: string;
  severity: string;
  recommendation: string;
  source?: 'local' | 'rxnorm';
}

interface DrugInteractionWarningProps {
  severity: 'contraindicated' | 'serious' | 'moderate' | 'minor' | 'none';
  interactions: Interaction[];
  onRequestDoctorApproval?: () => void;
  isDoctorApprovalPending?: boolean;
  onDismiss?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
}

/**
 * Severity configuration
 */
const SEVERITY_CONFIG = {
  contraindicated: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800',
    titleColor: 'text-red-900 dark:text-red-100',
    descColor: 'text-red-700 dark:text-red-200',
    badgeColor: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100',
    title: '🚫 Contraindicated Combination',
    message: 'This medication combination is contraindicated and cannot be dispensed.',
    canDispense: false,
    requiresApproval: false,
  },
  serious: {
    icon: AlertCircle,
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    borderColor: 'border-orange-200 dark:border-orange-800',
    titleColor: 'text-orange-900 dark:text-orange-100',
    descColor: 'text-orange-700 dark:text-orange-200',
    badgeColor: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100',
    title: '⚠️ Serious Interaction Detected',
    message: 'Doctor approval is required to proceed.',
    canDispense: false,
    requiresApproval: true,
  },
  moderate: {
    icon: Info,
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    titleColor: 'text-yellow-900 dark:text-yellow-100',
    descColor: 'text-yellow-700 dark:text-yellow-200',
    badgeColor: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100',
    title: '⚠️ Moderate Interaction',
    message: 'Use caution. Patient counseling recommended.',
    canDispense: true,
    requiresApproval: false,
  },
  minor: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
    titleColor: 'text-blue-900 dark:text-blue-100',
    descColor: 'text-blue-700 dark:text-blue-200',
    badgeColor: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100',
    title: 'ℹ️ Minor Interaction',
    message: 'Patient counseling recommended.',
    canDispense: true,
    requiresApproval: false,
  },
  none: {
    icon: Check,
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800',
    titleColor: 'text-green-900 dark:text-green-100',
    descColor: 'text-green-700 dark:text-green-200',
    badgeColor: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100',
    title: '✓ No Interactions',
    message: 'No significant drug interactions detected.',
    canDispense: true,
    requiresApproval: false,
  },
};

export function DrugInteractionWarning({
  severity,
  interactions,
  onRequestDoctorApproval,
  isDoctorApprovalPending = false,
  onDismiss,
  isExpanded = true,
  onToggleExpand,
}: DrugInteractionWarningProps) {
  // Don't render if no interactions
  if (severity === 'none' || interactions.length === 0) {
    return null;
  }

  const config = SEVERITY_CONFIG[severity];
  const Icon = config.icon;

  const handleToggle = () => {
    onToggleExpand?.(!isExpanded);
  };

  return (
    <Alert
      className={`${config.bgColor} ${config.borderColor} border-l-4`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.titleColor}`} />
          <div className="flex-1">
            <AlertTitle className={`${config.titleColor} font-semibold`}>
              {config.title}
            </AlertTitle>
            <AlertDescription className={config.descColor}>
              {config.message}
            </AlertDescription>
          </div>
        </div>

        {/* Expand/Collapse Toggle */}
        {interactions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            className="flex-shrink-0 h-8 w-8 p-0"
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Dismiss button */}
        {onDismiss && severity === 'minor' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="flex-shrink-0 h-8 w-8 p-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && interactions.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-current border-opacity-20 pt-4">
          {interactions.map((interaction, idx) => (
            <Card
              key={idx}
              className={`p-3 ${config.bgColor} border ${config.borderColor}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div
                    className={`font-semibold text-sm ${config.titleColor}`}
                  >
                    {interaction.interactingDrug}
                  </div>
                  <div
                    className={`text-sm mt-1.5 ${config.descColor}`}
                  >
                    {interaction.recommendation}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    className={config.badgeColor}
                    variant="secondary"
                  >
                    {interaction.severity}
                  </Badge>
                  {interaction.source === 'rxnorm' && (
                    <span className="text-xs opacity-60" title="From RxNorm database">
                      🌐
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {severity === 'serious' && onRequestDoctorApproval && (
              <Button
                onClick={onRequestDoctorApproval}
                disabled={isDoctorApprovalPending}
                className="flex-1 sm:flex-none"
                variant="outline"
              >
                {isDoctorApprovalPending ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    Awaiting Doctor Approval...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Request Doctor Approval
                  </>
                )}
              </Button>
            )}

            {/* Cannot Dispense Warning */}
            {!config.canDispense && (
              <div
                className={`flex items-center gap-2 ${config.descColor} font-semibold text-sm p-2 rounded`}
                role="status"
              >
                <X className="h-4 w-4" />
                Cannot dispense until issue resolved
              </div>
            )}
          </div>

          {/* Clinical Notes */}
          <div className={`text-xs ${config.descColor} opacity-75 mt-3 p-2 rounded bg-white bg-opacity-30`}>
            <strong>Note:</strong> Contact a pharmacist if you have questions about this interaction.
            For urgent concerns, consult the prescribing physician.
          </div>
        </div>
      )}

      {/* Collapsed View: Show Summary */}
      {!isExpanded && interactions.length > 0 && (
        <div className={`mt-2 text-sm ${config.descColor}`}>
          {interactions.length} interaction{interactions.length !== 1 ? 's' : ''} detected
        </div>
      )}
    </Alert>
  );
}

/**
 * Component Usage Examples:
 *
 * 1. No interactions:
 *    <DrugInteractionWarning severity="none" interactions={[]} />
 *    // Renders nothing
 *
 * 2. Minor warning (collapsible):
 *    <DrugInteractionWarning
 *      severity="minor"
 *      interactions={[{ interactingDrug: 'Aspirin', severity: 'minor', recommendation: 'Monitor bleeding risk' }]}
 *    />
 *
 * 3. Serious (requires approval):
 *    <DrugInteractionWarning
 *      severity="serious"
 *      interactions={[...]}
 *      onRequestDoctorApproval={() => triggerApprovalFlow()}
 *      isDoctorApprovalPending={isWaitingForDoctor}
 *    />
 *
 * 4. Contraindicated (blocks dispensing):
 *    <DrugInteractionWarning
 *      severity="contraindicated"
 *      interactions={[...]}
 *    />
 *    // User cannot proceed
 */
