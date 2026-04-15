import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRefreshAmendmentChain } from '@/hooks/useForensicQueries';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2 } from 'lucide-react';
import { sanitizeForLog } from '@/utils/sanitize';
import { type PrescriptionItem } from '@/lib/hooks/pharmacy';

/**
 * Phase 2B: Amendment Modal for Prescription Dosage Correction
 * 
 * Doctor can correct prescription dosage via amendment RPC function.
 * Amendment creates new audit record, links to original via amends_audit_id.
 * No changes to existing prescription or API.
 */

export interface AmendmentModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Prescription ID being amended */
  prescriptionId: string;
  /** Prescription items (for current dosages) */
  items?: PrescriptionItem[];
  /** Patient name (for confirmation) */
  patientName?: string;
  /** Callback after successful amendment */
  onAmendmentSuccess?: (amendmentId: string) => void;
}

interface AmendmentFormData {
  itemIndex: number; // Which item in prescription.items
  originalDosage: string;
  correctedDosage: string;
  correctedQuantity?: number;
  originalQuantity?: number;
  changeReason: string; // e.g., "Dosage reduction"
  amendmentJustification: string; // e.g., "Patient has Stage 2 CKD; reduced per renal function guidelines"
}

export function AmendmentModal({
  isOpen,
  onClose,
  prescriptionId,
  items = [],
  patientName = 'Patient',
  onAmendmentSuccess,
}: AmendmentModalProps) {
  const { profile, session } = useAuth();
  const { refreshPrescriptionChain } = useRefreshAmendmentChain();

  // Form state
  const [formData, setFormData] = useState<AmendmentFormData>({
    itemIndex: 0,
    originalDosage: items[0]?.dosage || '',
    correctedDosage: '',
    originalQuantity: items[0]?.quantity || undefined,
    correctedQuantity: undefined,
    changeReason: '',
    amendmentJustification: '',
  });

  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  // Amendment mutation
  const amendmentMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.hospital_id || !session?.user?.id) {
        throw new Error('Authentication required');
      }

      if (!formData.correctedDosage.trim()) {
        throw new Error('Corrected dosage is required');
      }

      if (!formData.changeReason.trim()) {
        throw new Error('Change reason is required');
      }

      if (!formData.amendmentJustification.trim()) {
        throw new Error('Amendment justification is required');
      }

      const currentItem = items[selectedItemIndex];
      if (!currentItem) {
        throw new Error('Invalid prescription item selected');
      }

      // Call amend_prescription_dosage RPC function
      const { data, error } = await supabase.rpc('amend_prescription_dosage', {
        p_prescription_id: prescriptionId,
        p_item_id: currentItem.id,
        p_old_dosage: formData.originalDosage,
        p_new_dosage: formData.correctedDosage,
        p_old_quantity: formData.originalQuantity || null,
        p_new_quantity: formData.correctedQuantity || null,
        p_amendment_reason: formData.changeReason,
        p_amendment_justification: formData.amendmentJustification,
        p_amending_doctor_id: session.user.id,
      });

      if (error) {
        console.error('Amendment RPC failed:', sanitizeForLog(error.message));
        throw new Error(error.message || 'Amendment failed');
      }

      return data;
    },

    onSuccess: (data) => {
      toast.success('Amendment submitted', {
        description: `Amendment ID: ${data || prescriptionId}`,
      });

      // Refresh amendment chain to show new entry
      refreshPrescriptionChain(prescriptionId);

      // Callback
      if (onAmendmentSuccess) {
        onAmendmentSuccess(data);
      }

      // Reset form and close
      setFormData({
        itemIndex: 0,
        originalDosage: items[0]?.dosage || '',
        correctedDosage: '',
        originalQuantity: items[0]?.quantity || undefined,
        correctedQuantity: undefined,
        changeReason: '',
        amendmentJustification: '',
      });
      onClose();
    },

    onError: (error: Error) => {
      toast.error('Amendment failed', {
        description: error.message,
      });
    },
  });

  const handleItemChange = (index: string) => {
    const idx = parseInt(index, 10);
    setSelectedItemIndex(idx);
    const item = items[idx];
    setFormData(prev => ({
      ...prev,
      itemIndex: idx,
      originalDosage: item?.dosage || '',
      originalQuantity: item?.quantity || undefined,
      correctedDosage: '',
      correctedQuantity: undefined,
    }));
  };

  const handleInputChange = (
    field: keyof AmendmentFormData,
    value: string | number | undefined
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const currentItem = items[selectedItemIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Amend Prescription Dosage</DialogTitle>
          <DialogDescription>
            Correct prescription dosage with audit trail. Patient: {patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alert: Amendment creates audit record */}
          <div className="flex gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              Amendment creates immutable audit record linked to original prescription.
              Original prescription is not modified.
            </div>
          </div>

          {/* Item selector */}
          <div className="space-y-2">
            <Label htmlFor="item-select" className="text-sm font-medium">
              Select Medication
            </Label>
            <Select
              value={selectedItemIndex.toString()}
              onValueChange={handleItemChange}
            >
              <SelectTrigger id="item-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((item, idx) => (
                  <SelectItem key={item.id} value={idx.toString()}>
                    {item.medication_name} ({item.dosage}, {item.frequency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current State */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-xs font-medium text-gray-600">Current Dosage</Label>
              <p className="text-sm font-semibold mt-1">
                {currentItem?.dosage || 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Current Quantity</Label>
              <p className="text-sm font-semibold mt-1">
                {currentItem?.quantity || 'N/A'} units
              </p>
            </div>
          </div>

          {/* Amendment Fields */}
          <div className="space-y-4 border-t pt-4">
            {/* Corrected Dosage */}
            <div className="space-y-2">
              <Label htmlFor="corrected-dosage" className="text-sm font-medium">
                Corrected Dosage <span className="text-red-500">*</span>
              </Label>
              <Input
                id="corrected-dosage"
                placeholder="e.g., 250mg BID"
                value={formData.correctedDosage}
                onChange={(e) => handleInputChange('correctedDosage', e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-gray-500">
                Example: 500mg BID → 250mg BID (for renal function)
              </p>
            </div>

            {/* Corrected Quantity (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="corrected-quantity" className="text-sm font-medium">
                Corrected Quantity (optional)
              </Label>
              <Input
                id="corrected-quantity"
                type="number"
                placeholder="e.g., 28"
                value={formData.correctedQuantity || ''}
                onChange={(e) => 
                  handleInputChange('correctedQuantity', e.target.value ? parseInt(e.target.value, 10) : undefined)
                }
                className="text-sm"
              />
              <p className="text-xs text-gray-500">
                Leave blank if quantity unchanged
              </p>
            </div>

            {/* Change Reason */}
            <div className="space-y-2">
              <Label htmlFor="change-reason" className="text-sm font-medium">
                Change Reason <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.changeReason}
                onValueChange={(value) => handleInputChange('changeReason', value)}
              >
                <SelectTrigger id="change-reason">
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Drug interaction detected">Drug interaction detected</SelectItem>
                  <SelectItem value="Renal function adjustment">Renal function adjustment</SelectItem>
                  <SelectItem value="Hepatic function adjustment">Hepatic function adjustment</SelectItem>
                  <SelectItem value="Adverse reaction">Adverse reaction</SelectItem>
                  <SelectItem value="Clinical deterioration">Clinical deterioration</SelectItem>
                  <SelectItem value="Clinical improvement">Clinical improvement</SelectItem>
                  <SelectItem value="Patient tolerance issue">Patient tolerance issue</SelectItem>
                  <SelectItem value="Dosage calculation error">Dosage calculation error</SelectItem>
                  <SelectItem value="Insurance restriction">Insurance restriction</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amendment Justification */}
            <div className="space-y-2">
              <Label htmlFor="justification" className="text-sm font-medium">
                Clinical Justification <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="justification"
                placeholder="Detailed clinical reason for amendment (for audit trail and compliance)..."
                value={formData.amendmentJustification}
                onChange={(e) => handleInputChange('amendmentJustification', e.target.value)}
                rows={4}
                className="text-sm resize-none"
              />
              <p className="text-xs text-gray-500">
                Required for audit trail. Example:
                "Patient has Stage 2 CKD (eGFR 45); reduced dosage per renal function guidelines. Standard dose 500mg BID would exceed safe exposure."
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-2">Amendment Summary</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Original: {formData.originalDosage}</li>
              <li>• Corrected: {formData.correctedDosage || 'N/A'}</li>
              <li>• Reason: {formData.changeReason || 'None selected'}</li>
              <li>• Creates immutable audit record</li>
              <li>• Pharmacist notified for review</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={amendmentMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => amendmentMutation.mutate()}
            disabled={
              amendmentMutation.isPending ||
              !formData.correctedDosage ||
              !formData.changeReason ||
              !formData.amendmentJustification
            }
            className="gap-2"
          >
            {amendmentMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Amendment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
