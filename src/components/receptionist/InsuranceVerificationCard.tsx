import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  DollarSign,
  FileText,
  Phone,
  Loader2
} from 'lucide-react';
import { InsuranceVerification } from '@/types/scheduling';

interface InsuranceVerificationCardProps {
  patientId: string;
  appointmentId?: string;
  existingVerification?: InsuranceVerification;
  onVerify: (verification: Partial<InsuranceVerification>) => void;
  onSave: (verification: Partial<InsuranceVerification>) => void;
}

export const InsuranceVerificationCard: React.FC<InsuranceVerificationCardProps> = ({
  patientId,
  appointmentId,
  existingVerification,
  onVerify,
  onSave
}) => {
  const [verification, setVerification] = useState<Partial<InsuranceVerification>>(
    existingVerification || {
      patient_id: patientId,
      appointment_id: appointmentId,
      verification_status: 'pending',
      requires_authorization: false
    }
  );
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!verification.insurance_provider || !verification.policy_number) return;

    setLoading(true);
    try {
      // Simulate insurance verification API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock verification response
      const mockResponse = {
        verification_status: Math.random() > 0.2 ? 'verified' : 'failed',
        copay_amount: Math.random() > 0.3 ? 25 : 0,
        deductible_amount: Math.random() > 0.5 ? 1000 : 500,
        deductible_met: Math.random() * 500,
        coverage_percentage: Math.random() > 0.3 ? 80 : 70,
        requires_authorization: Math.random() > 0.7,
        verified_at: new Date().toISOString(),
        verification_response: {
          eligibility: 'active',
          effective_date: '2024-01-01',
          plan_type: 'PPO',
          network_status: 'in-network'
        }
      };

      setVerification(prev => ({ ...prev, ...mockResponse }));
      onVerify({ ...verification, ...mockResponse });
    } catch (error) {
      setVerification(prev => ({
        ...prev,
        verification_status: 'failed',
        error_message: 'Unable to verify insurance at this time'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onSave(verification);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      case 'expired': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Insurance Verification
          </span>
          <Badge className={getStatusColor(verification.verification_status || 'pending')}>
            {getStatusIcon(verification.verification_status || 'pending')}
            {(verification.verification_status || 'pending').toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Insurance Details */}
        <div className="space-y-4">
          <h4 className="font-medium">Insurance Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="insurance-provider">Insurance Provider *</Label>
              <Input
                id="insurance-provider"
                value={verification.insurance_provider || ''}
                onChange={(e) => setVerification(prev => ({ ...prev, insurance_provider: e.target.value }))}
                placeholder="e.g., Blue Cross Blue Shield"
              />
            </div>

            <div>
              <Label htmlFor="policy-number">Policy Number *</Label>
              <Input
                id="policy-number"
                value={verification.policy_number || ''}
                onChange={(e) => setVerification(prev => ({ ...prev, policy_number: e.target.value }))}
                placeholder="Policy/ID number"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="group-number">Group Number</Label>
              <Input
                id="group-number"
                value={verification.group_number || ''}
                onChange={(e) => setVerification(prev => ({ ...prev, group_number: e.target.value }))}
                placeholder="Group number (if applicable)"
              />
            </div>

            <div>
              <Label htmlFor="member-id">Member ID</Label>
              <Input
                id="member-id"
                value={verification.member_id || ''}
                onChange={(e) => setVerification(prev => ({ ...prev, member_id: e.target.value }))}
                placeholder="Member ID (if different from policy)"
              />
            </div>
          </div>

          <Button 
            onClick={handleVerify} 
            disabled={loading || !verification.insurance_provider || !verification.policy_number}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying Insurance...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Verify Insurance Eligibility
              </>
            )}
          </Button>
        </div>

        {/* Verification Results */}
        {verification.verification_status && verification.verification_status !== 'pending' && (
          <div className="space-y-4">
            <h4 className="font-medium">Verification Results</h4>
            
            {verification.verification_status === 'verified' ? (
              <div className="space-y-4">
                {/* Coverage Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium">Copay</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">
                      ${verification.copay_amount?.toFixed(2) || '0.00'}
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800 mb-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Coverage</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">
                      {verification.coverage_percentage || 0}%
                    </p>
                  </div>
                </div>

                {/* Deductible Information */}
                <div className="p-3 bg-gray-50 border rounded-lg">
                  <h5 className="font-medium mb-2">Deductible Information</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <Label>Annual Deductible</Label>
                      <p className="font-medium">${verification.deductible_amount?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <Label>Deductible Met</Label>
                      <p className="font-medium">${verification.deductible_met?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <Label>Remaining</Label>
                      <p className="font-medium">
                        ${((verification.deductible_amount || 0) - (verification.deductible_met || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Authorization Required */}
                {verification.requires_authorization && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Prior Authorization Required</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="auth-number">Authorization Number</Label>
                        <Input
                          id="auth-number"
                          value={verification.authorization_number || ''}
                          onChange={(e) => setVerification(prev => ({ 
                            ...prev, 
                            authorization_number: e.target.value 
                          }))}
                          placeholder="Enter authorization number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="auth-expires">Authorization Expires</Label>
                        <Input
                          id="auth-expires"
                          type="datetime-local"
                          value={verification.authorization_expires_at?.slice(0, 16) || ''}
                          onChange={(e) => setVerification(prev => ({ 
                            ...prev, 
                            authorization_expires_at: e.target.value ? new Date(e.target.value).toISOString() : undefined
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Plan Details */}
                {verification.verification_response && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h5 className="font-medium mb-2">Plan Details</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <Label>Plan Type</Label>
                        <p>{verification.verification_response.plan_type || 'N/A'}</p>
                      </div>
                      <div>
                        <Label>Network Status</Label>
                        <p>{verification.verification_response.network_status || 'N/A'}</p>
                      </div>
                      <div>
                        <Label>Effective Date</Label>
                        <p>{verification.verification_response.effective_date || 'N/A'}</p>
                      </div>
                      <div>
                        <Label>Eligibility</Label>
                        <p className="capitalize">{verification.verification_response.eligibility || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Verification Failed */
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Verification Failed</span>
                </div>
                <p className="text-sm text-red-700">
                  {verification.error_message || 'Unable to verify insurance eligibility. Please check the information and try again.'}
                </p>
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-red-800">Next Steps:</p>
                  <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                    <li>Verify insurance information with patient</li>
                    <li>Contact insurance provider directly</li>
                    <li>Consider self-pay options</li>
                    <li>Reschedule if authorization needed</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Verification Timestamp */}
            {verification.verified_at && (
              <div className="text-xs text-muted-foreground">
                Verified on {new Date(verification.verified_at).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            value={verification.error_message || ''}
            onChange={(e) => setVerification(prev => ({ ...prev, error_message: e.target.value }))}
            placeholder="Any additional notes about insurance verification..."
            rows={2}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          {verification.verification_status === 'failed' && (
            <Button variant="outline" onClick={() => window.open('tel:')}>
              <Phone className="h-4 w-4 mr-2" />
              Call Insurance
            </Button>
          )}
          <Button onClick={handleSave}>
            Save Verification
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};