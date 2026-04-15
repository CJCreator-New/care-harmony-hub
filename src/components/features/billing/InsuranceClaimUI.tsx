/**
 * InsuranceClaimUI.tsx
 * Feature 4.4: Insurance Claims Management UI
 *
 * Displays claim status, resubmit actions, and insurance coordination
 */

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, RefreshCw, FileText, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeForLog } from '@/lib/sanitize.utils';

interface ClaimLine {
  claim_line_id: string;
  service_code: string;
  service_description: string;
  units: number;
  charged_amount: number;
  allowed_amount: number;
  deductible: number;
  coinsurance: number;
  insurance_pays: number;
  patient_responsibility: number;
  claim_status: 'submitted' | 'acknowledged' | 'in_review' | 'approved' | 'denied' | 'adjusted';
  denial_reason?: string;
}

interface InsuranceClaim {
  claim_id: string;
  invoice_id: string;
  patient_id: string;
  insurance_plan: string;
  submission_date: string;
  claim_reference_number?: string;
  claim_status: 'draft' | 'submitted' | 'acknowledged' | 'in_review' | 'approved' | 'denied' | 'appealed';
  claim_lines: ClaimLine[];
  total_charged: number;
  total_allowed: number;
  total_insurance_pays: number;
  total_patient_responsible: number;
  insurance_response_date?: string;
  appeal_deadline?: string;
  notes?: string;
}

interface InsuranceClaimUIProps {
  invoiceId: string;
  hospitalId: string;
  onClaimUpdated?: (claim: InsuranceClaim) => void;
}

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  const icons: Record<string, React.ReactNode> = {
    submitted: <Clock className="h-4 w-4 text-blue-500" />,
    acknowledged: <CheckCircle className="h-4 w-4 text-blue-500" />,
    in_review: <Clock className="h-4 w-4 text-yellow-500" />,
    approved: <CheckCircle className="h-4 w-4 text-green-500" />,
    denied: <AlertCircle className="h-4 w-4 text-red-500" />,
    adjusted: <RefreshCw className="h-4 w-4 text-orange-500" />,
    appealed: <FileText className="h-4 w-4 text-purple-500" />,
  };
  return icons[status] || icons.submitted;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const variants: Record<string, any> = {
    submitted: 'secondary',
    acknowledged: 'secondary',
    in_review: 'outline',
    approved: 'default',
    denied: 'destructive',
    adjusted: 'outline',
    appealed: 'outline',
  };

  return (
    <Badge variant={variants[status] || 'secondary'} className="flex items-center gap-1">
      <StatusIcon status={status} />
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  );
};

export const InsuranceClaimUI: React.FC<InsuranceClaimUIProps> = ({
  invoiceId,
  hospitalId,
  onClaimUpdated,
}) => {
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);

  // Fetch claims for invoice
  const { data: claims, isLoading, refetch } = useQuery({
    queryKey: ['insurance-claims', invoiceId, hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_claims')
        .select('*, claim_lines(*)')
        .eq('invoice_id', invoiceId)
        .eq('hospital_id', hospitalId)
        .order('submission_date', { ascending: false });

      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  // Resubmit claim mutation
  const resubmitClaimMutation = useMutation({
    mutationFn: async (claimId: string) => {
      const { data, error } = await supabase.functions.invoke('resubmit-insurance-claim', {
        body: {
          claim_id: claimId,
          hospital_id: hospitalId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Claim resubmitted successfully');
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to resubmit claim');
      console.error('Resubmit error:', sanitizeForLog(error));
    },
  });

  // Appeal claim mutation
  const appealClaimMutation = useMutation({
    mutationFn: async (claimId: string) => {
      const { data, error } = await supabase.functions.invoke('appeal-insurance-claim', {
        body: {
          claim_id: claimId,
          hospital_id: hospitalId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Claim appeal initiated');
      refetch();
    },
    onError: (error) => {
      toast.error('Failed to initiate appeal');
      console.error('Appeal error:', sanitizeForLog(error));
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading claims...</div>;
  }

  if (!claims || claims.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No claims submitted for this invoice yet.</AlertDescription>
      </Alert>
    );
  }

  const currentClaim = selectedClaim || claims[0];

  return (
    <div className="w-full space-y-4">
      {/* Claims List Tabs */}
      <Tabs defaultValue={currentClaim.claim_id}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {claims.map((claim) => (
            <TabsTrigger
              key={claim.claim_id}
              value={claim.claim_id}
              onClick={() => setSelectedClaim(claim)}
              className="whitespace-nowrap"
            >
              {claim.claim_reference_number || `Claim ${claim.claim_id.slice(0, 8)}`}
            </TabsTrigger>
          ))}
        </TabsList>

        {claims.map((claim) => (
          <TabsContent key={claim.claim_id} value={claim.claim_id} className="space-y-4">
            {/* Claim Header */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>
                      {claim.claim_reference_number || `Claim ${claim.claim_id}`}
                    </CardTitle>
                    <CardDescription>
                      <strong>Insurance Plan:</strong> {claim.insurance_plan} |{' '}
                      <strong>Submitted:</strong> {format(parseISO(claim.submission_date), 'MMM dd, yyyy')}
                    </CardDescription>
                  </div>
                  <StatusBadge status={claim.claim_status} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground">Total Charged</span>
                    <div className="text-lg font-semibold">
                      ${claim.total_charged.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Allowed Amount</span>
                    <div className="text-lg font-semibold">
                      ${claim.total_allowed.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Insurance Pays</span>
                    <div className="text-lg font-semibold text-green-600">
                      ${claim.total_insurance_pays.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Patient Responsible</span>
                    <div className="text-lg font-semibold text-blue-600">
                      ${claim.total_patient_responsible.toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Claim Progress Timeline */}
            {claim.insurance_response_date && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Claim Status Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Processing Status</span>
                      <span className="text-xs text-muted-foreground">
                        {differenceInDays(new Date(claim.insurance_response_date), new Date(claim.submission_date))} days
                      </span>
                    </div>
                    <Progress
                      value={
                        claim.claim_status === 'approved'
                          ? 100
                          : claim.claim_status === 'in_review'
                          ? 66
                          : claim.claim_status === 'acknowledged'
                          ? 33
                          : 0
                      }
                    />
                  </div>
                  {claim.insurance_response_date && (
                    <div className="text-xs text-muted-foreground">
                      Response received: {format(parseISO(claim.insurance_response_date), 'MMM dd, yyyy')}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Claim Details - Line Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Claim Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Service Code</th>
                        <th className="text-left py-2">Description</th>
                        <th className="text-right py-2">Units</th>
                        <th className="text-right py-2">Charged</th>
                        <th className="text-right py-2">Allowed</th>
                        <th className="text-right py-2">Insurance</th>
                        <th className="text-right py-2">Patient</th>
                        <th className="text-left py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claim.claim_lines.map((line) => (
                        <tr key={line.claim_line_id} className="border-b hover:bg-slate-50">
                          <td className="font-mono text-xs py-2">{line.service_code}</td>
                          <td className="py-2 max-w-xs truncate">{line.service_description}</td>
                          <td className="text-right py-2">{line.units}</td>
                          <td className="text-right py-2">${line.charged_amount.toFixed(2)}</td>
                          <td className="text-right py-2">${line.allowed_amount.toFixed(2)}</td>
                          <td className="text-right py-2 text-green-600">
                            ${line.insurance_pays.toFixed(2)}
                          </td>
                          <td className="text-right py-2 text-blue-600">
                            ${line.patient_responsibility.toFixed(2)}
                          </td>
                          <td className="py-2">
                            <Badge
                              variant={
                                line.claim_status === 'approved'
                                  ? 'default'
                                  : line.claim_status === 'denied'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {line.claim_status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Denial Reasons (if any) */}
            {claim.claim_lines.some((l) => l.claim_status === 'denied' && l.denial_reason) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Denial Reasons:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {claim.claim_lines
                      .filter((l) => l.denial_reason)
                      .map((l) => (
                        <li key={l.claim_line_id}>
                          <strong>{l.service_code}:</strong> {l.denial_reason}
                        </li>
                      ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              {claim.claim_status === 'denied' && claim.appeal_deadline && (
                isAfter(new Date(), parseISO(claim.appeal_deadline)) ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Appeal deadline passed on{' '}
                      {format(parseISO(claim.appeal_deadline), 'MMM dd, yyyy')}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Button
                    onClick={() => appealClaimMutation.mutate(claim.claim_id)}
                    disabled={appealClaimMutation.isPending}
                  >
                    {appealClaimMutation.isPending ? 'Initiating Appeal...' : 'Initiate Appeal'}
                  </Button>
                )
              )}

              {['denied', 'adjusted'].includes(claim.claim_status) && (
                <Button
                  variant="outline"
                  onClick={() => resubmitClaimMutation.mutate(claim.claim_id)}
                  disabled={resubmitClaimMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {resubmitClaimMutation.isPending ? 'Resubmitting...' : 'Resubmit Claim'}
                </Button>
              )}

              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Download EOB
              </Button>

              <Button variant="outline">
                <DollarSign className="h-4 w-4 mr-2" />
                View Detailed Analysis
              </Button>
            </div>

            {/* Notes */}
            {claim.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{claim.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default InsuranceClaimUI;

// Helper function
function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}
