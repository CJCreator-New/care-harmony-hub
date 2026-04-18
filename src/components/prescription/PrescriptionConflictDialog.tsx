/**
 * Component for handling and displaying prescription version conflicts
 * Allows user to review server changes and merge with their updates
 */

import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { VersionConflictError, Prescription } from '@/hooks/usePrescriptionOptimisticLock';

export interface PrescriptionConflictDialogProps {
  conflict: VersionConflictError;
  yourUpdates: Partial<Prescription>;
  onKeepServer: () => void;
  onMergeAndRetry: (mergedData: Partial<Prescription>) => void;
  isResolving?: boolean;
}

/**
 * Dialog showing version conflict with side-by-side diff
 */
export function PrescriptionConflictDialog({
  conflict,
  yourUpdates,
  onKeepServer,
  onMergeAndRetry,
  isResolving = false,
}: PrescriptionConflictDialogProps) {
  const [showDetails, setShowDetails] = useState(true);
  const [selectedMerge, setSelectedMerge] = useState<Partial<Prescription>>({});

  const getFieldDifferences = () => {
    const differences: Array<{
      field: string;
      yourValue: any;
      serverValue: any;
      conflict: boolean;
    }> = [];

    // Check all fields that were in your updates
    Object.keys(yourUpdates).forEach((field) => {
      const yourValue = yourUpdates[field as keyof Prescription];
      const serverValue = conflict.serverData[field as keyof Prescription];

      if (yourValue !== serverValue) {
        differences.push({
          field,
          yourValue,
          serverValue,
          conflict: true,
        });
      }
    });

    return differences;
  };

  const differences = getFieldDifferences();
  const hasConflicts = differences.length > 0;

  return (
    <Alert className="border-amber-500 bg-amber-50">
      <AlertCircle className="h-5 w-5 text-amber-600" />
      <AlertDescription className="ml-2">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h3 className="font-semibold text-amber-900">Prescription Conflict Detected</h3>
            <p className="text-sm text-amber-800 mt-1">
              This prescription was modified by another user while you were editing it.
            </p>
          </div>

          {/* Version Info */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Your Version: {conflict.clientVersion}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Server Version: {conflict.serverVersion}
              </Badge>
            </div>
          </div>

          {/* Conflicts Display */}
          {hasConflicts && (
            <div className="space-y-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm font-medium hover:text-amber-900 transition-colors"
              >
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {differences.length} Field{differences.length !== 1 ? 's' : ''} Changed
              </button>

              {showDetails && (
                <div className="mt-3 space-y-2">
                  <Tabs defaultValue="diff" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="diff">Side by Side</TabsTrigger>
                      <TabsTrigger value="merge">Choose Changes</TabsTrigger>
                    </TabsList>

                    {/* Side-by-side diff */}
                    <TabsContent value="diff" className="space-y-2 mt-3">
                      {differences.map((diff) => (
                        <div key={diff.field} className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-red-50 p-2 rounded border border-red-200">
                            <div className="font-semibold text-red-900">Your Change ({diff.field}):</div>
                            <div className="text-red-700 font-mono break-words">
                              {JSON.stringify(diff.yourValue)}
                            </div>
                          </div>
                          <div className="bg-green-50 p-2 rounded border border-green-200">
                            <div className="font-semibold text-green-900">Server Version ({diff.field}):</div>
                            <div className="text-green-700 font-mono break-words">
                              {JSON.stringify(diff.serverValue)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    {/* Choose changes to merge */}
                    <TabsContent value="merge" className="space-y-2 mt-3">
                      <p className="text-xs text-gray-600 mb-3">
                        Select which version to keep for each field:
                      </p>
                      {differences.map((diff) => (
                        <div key={diff.field} className="space-y-1">
                          <label className="text-xs font-medium">{diff.field}</label>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={
                                selectedMerge[diff.field as keyof Prescription] === diff.yourValue
                                  ? 'default'
                                  : 'outline'
                              }
                              onClick={() => {
                                setSelectedMerge((prev) => ({
                                  ...prev,
                                  [diff.field]: diff.yourValue,
                                }));
                              }}
                              className="flex-1 text-xs"
                            >
                              Your: {JSON.stringify(diff.yourValue).slice(0, 20)}...
                            </Button>
                            <Button
                              size="sm"
                              variant={
                                selectedMerge[diff.field as keyof Prescription] === diff.serverValue
                                  ? 'default'
                                  : 'outline'
                              }
                              onClick={() => {
                                setSelectedMerge((prev) => ({
                                  ...prev,
                                  [diff.field]: diff.serverValue,
                                }));
                              }}
                              className="flex-1 text-xs"
                            >
                              Server: {JSON.stringify(diff.serverValue).slice(0, 20)}...
                            </Button>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onKeepServer}
              disabled={isResolving}
              className="flex-1"
            >
              Keep Server Version
            </Button>
            <Button
              size="sm"
              onClick={() => onMergeAndRetry(selectedMerge)}
              disabled={isResolving || Object.keys(selectedMerge).length === 0}
              className="flex-1"
            >
              {isResolving ? 'Resolving...' : 'Merge & Retry'}
            </Button>
          </div>

          {/* Help text */}
          <p className="text-xs text-amber-700 mt-2">
            💡 <strong>Tip:</strong> Review the changes above and choose which version to keep for each field.
            Then click "Merge & Retry" to resubmit your update with the merged data.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export default PrescriptionConflictDialog;
