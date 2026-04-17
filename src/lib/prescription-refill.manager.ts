// @ts-nocheck
/**
 * prescription-refill.manager.ts
 * Feature 3: Prescription Refill Workflows
 * 
 * Manages prescription refill requests, auto-renewals, and pharmacy coordination
 * with insurance verification and patient notification
 */

import { supabase } from '@/lib/supabase';
import { format, addDays, isAfter, differenceInDays } from 'date-fns';
import { sanitizeForLog, ValidationError } from '@/lib/sanitize.utils';

export enum RefillStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DISPENSED = 'dispensed',
  CANCELLED = 'cancelled',
  ERROR = 'error',
}

export interface RefillPolicy {
  auto_refill_enabled: boolean;
  refill_days_before_expiry: number; // Refill N days before prescription ends
  max_refills_per_year: number;
  require_doctor_approval: boolean;
  insurance_preauth_required: boolean;
}

export interface PrescriptionRefillRequest {
  prescription_id: string;
  patient_id: string;
  doctor_id: string;
  hospital_id: string;
  pharmacy_id: string;
  quantity_requested: number;
  reason: 'patient_request' | 'auto_refill' | 'emergency' | 'insurance_requirement';
  requested_at: Date;
  priority: 'routine' | 'urgent' | 'stat';
}

export interface RefillPolicyValidation {
  is_valid: boolean;
  reason?: string;
  requires_approval?: boolean;
  requires_insurance_preauth?: boolean;
  estimated_cost?: number;
  days_until_next_eligible_refill?: number;
}

export class PrescriptionRefillManager {
  /**
   * Get refill policy for a prescription
   */
  static async getRefillPolicy(
    prescriptionId: string,
    hospitalId: string
  ): Promise<RefillPolicy | null> {
    try {
      const { data, error } = await supabase
        .from('prescription_auto_refill_policies')
        .select('*')
        .eq('prescription_id', prescriptionId)
        .eq('hospital_id', hospitalId)
        .single();

      if (error) {
        console.warn('Refill policy not found:', sanitizeForLog({ prescriptionId }));
        return null;
      }

      return {
        auto_refill_enabled: data.auto_refill_enabled || false,
        refill_days_before_expiry: data.refill_days_before_expiry || 7,
        max_refills_per_year: data.max_refills_per_year || 12,
        require_doctor_approval: data.require_doctor_approval || false,
        insurance_preauth_required: data.insurance_preauth_required || false,
      };
    } catch (error) {
      console.error('Refill policy query error:', sanitizeForLog(error));
      throw error;
    }
  }

  /**
   * Validate if prescription is eligible for refill
   */
  static async validateRefillEligibility(
    request: PrescriptionRefillRequest,
    policy: RefillPolicy
  ): Promise<RefillPolicyValidation> {
    try {
      // Get prescription details
      const { data: prescription, error: prescError } = await supabase
        .from('prescriptions')
        .select('expiry_date, refills_remaining, status, last_refilled_at')
        .eq('id', request.prescription_id)
        .eq('hospital_id', request.hospital_id)
        .single();

      if (prescError || !prescription) {
        return {
          is_valid: false,
          reason: 'Prescription not found',
        };
      }

      // Check if prescription is still active
      if (prescription.status !== 'active' && prescription.status !== 'issued') {
        return {
          is_valid: false,
          reason: `Prescription status is ${prescription.status}, cannot refill`,
        };
      }

      // Check if prescription has expired
      if (isAfter(new Date(), new Date(prescription.expiry_date))) {
        return {
          is_valid: false,
          reason: `Prescription expired on ${format(new Date(prescription.expiry_date), 'MMM dd, yyyy')}`,
        };
      }

      // Check refills remaining
      if (prescription.refills_remaining === 0) {
        return {
          is_valid: false,
          reason: 'No refills remaining',
          requires_approval: true, // Doctor can authorize new refills
        };
      }

      // Check if too soon since last refill (early refill policy)
      if (prescription.last_refilled_at) {
        const daysSinceLastRefill = differenceInDays(
          new Date(),
          new Date(prescription.last_refilled_at)
        );

        // Typical early refill grace period: 80% of days supply
        const daysSupply = Math.ceil(
          (prescription.quantity || 30) / (prescription.dose_frequency || 1)
        );
        const minDaysBetweenRefills = Math.ceil(daysSupply * 0.8);

        if (daysSinceLastRefill < minDaysBetweenRefills) {
          const daysUntilEligible = minDaysBetweenRefills - daysSinceLastRefill;
          return {
            is_valid: false,
            reason: `Too early to refill. Eligible in ${daysUntilEligible} days`,
            days_until_next_eligible_refill: daysUntilEligible,
          };
        }
      }

      // Check refill count against policy
      const { data: refillHistory, error: historyError } = await supabase
        .from('prescription_refill_requests')
        .select('id')
        .eq('prescription_id', request.prescription_id)
        .eq('status', RefillStatus.DISPENSED)
        .gte(
          'created_at',
          format(addDays(new Date(), -365), 'yyyy-MM-dd') // Last 12 months
        );

      if (!historyError && refillHistory) {
        if (refillHistory.length >= policy.max_refills_per_year) {
          return {
            is_valid: false,
            reason: `Max refills (${policy.max_refills_per_year}) reached in last 12 months`,
            requires_approval: true,
          };
        }
      }

      // Check insurance requirements
      let requires_insurance_preauth = false;
      if (policy.insurance_preauth_required) {
        const { data: claim } = await supabase
          .from('insurance_claims')
          .select('status')
          .eq('prescription_id', request.prescription_id)
          .eq('status', 'pending')
          .single();

        if (!claim) {
          requires_insurance_preauth = true;
        }
      }

      return {
        is_valid: true,
        requires_approval: policy.require_doctor_approval,
        requires_insurance_preauth,
        estimated_cost: prescription.estimated_cost,
      };
    } catch (error) {
      console.error('Refill eligibility validation error:', sanitizeForLog(error));
      throw error;
    }
  }

  /**
   * Create refill request
   */
  static async createRefillRequest(
    request: PrescriptionRefillRequest,
    validation: RefillPolicyValidation
  ): Promise<{ refill_request_id: string; status: RefillStatus; error?: string }> {
    try {
      if (!validation.is_valid) {
        return {
          refill_request_id: '',
          status: RefillStatus.ERROR,
          error: validation.reason || 'Validation failed',
        };
      }

      // Create refill request record
      const { data, error } = await supabase
        .from('prescription_refill_requests')
        .insert({
          prescription_id: request.prescription_id,
          patient_id: request.patient_id,
          doctor_id: request.doctor_id,
          hospital_id: request.hospital_id,
          pharmacy_id: request.pharmacy_id,
          quantity_requested: request.quantity_requested,
          reason: request.reason,
          requested_at: request.requested_at.toISOString(),
          priority: request.priority,
          status: validation.requires_approval ? RefillStatus.PENDING : RefillStatus.APPROVED,
          requires_insurance_preauth: validation.requires_insurance_preauth,
          created_at: new Date().toISOString(),
        })
        .select('id, status')
        .single();

      if (error) {
        console.error('Refill request creation error:', sanitizeForLog(error));
        return {
          refill_request_id: '',
          status: RefillStatus.ERROR,
          error: error.message,
        };
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        hospital_id: request.hospital_id,
        action: 'prescription_refill_requested',
        entity_type: 'prescription_refill_request',
        entity_id: data.id,
        actor_id: request.patient_id,
        actor_role: 'patient',
        target_patient_id: request.patient_id,
        details: {
          prescription_id: request.prescription_id,
          reason: request.reason,
          priority: request.priority,
        },
        timestamp: new Date().toISOString(),
        phi_involved: true,
      });

      console.log('Refill request created:', sanitizeForLog({
        request_id: data.id,
        prescription_id: request.prescription_id,
        status: data.status,
      }));

      return {
        refill_request_id: data.id,
        status: data.status as RefillStatus,
      };
    } catch (error) {
      console.error('Refill request creation error:', sanitizeForLog(error));
      throw error;
    }
  }

  /**
   * Approve refill request (Doctor action)
   */
  static async approveRefill(
    refillRequestId: string,
    doctorId: string,
    hospitalId: string
  ): Promise<{ approved: boolean; error?: string }> {
    try {
      // Verify request belongs to this hospital
      const { data: request } = await supabase
        .from('prescription_refill_requests')
        .select('*')
        .eq('id', refillRequestId)
        .eq('hospital_id', hospitalId)
        .single();

      if (!request) {
        return { approved: false, error: 'Refill request not found' };
      }

      // Update status to approved
      const { error } = await supabase
        .from('prescription_refill_requests')
        .update({
          status: RefillStatus.APPROVED,
          approved_by: doctorId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', refillRequestId);

      if (error) {
        console.error('Approve refill error:', sanitizeForLog(error));
        return { approved: false, error: error.message };
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        hospital_id: hospitalId,
        action: 'prescription_refill_approved',
        entity_type: 'prescription_refill_request',
        entity_id: refillRequestId,
        actor_id: doctorId,
        actor_role: 'doctor',
        target_patient_id: request.patient_id,
        details: { prescription_id: request.prescription_id },
        timestamp: new Date().toISOString(),
        phi_involved: true,
      });

      console.log('Refill approved:', sanitizeForLog({ request_id: refillRequestId }));

      return { approved: true };
    } catch (error) {
      console.error('Approve refill error:', sanitizeForLog(error));
      throw error;
    }
  }

  /**
   * Reject refill request with reason
   */
  static async rejectRefill(
    refillRequestId: string,
    doctorId: string,
    hospitalId: string,
    reason: string
  ): Promise<{ rejected: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('prescription_refill_requests')
        .update({
          status: RefillStatus.REJECTED,
          rejected_by: doctorId,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', refillRequestId)
        .eq('hospital_id', hospitalId);

      if (error) {
        return { rejected: false, error: error.message };
      }

      // Notify patient of rejection
      const { data: request } = await supabase
        .from('prescription_refill_requests')
        .select('patient_id')
        .eq('id', refillRequestId)
        .single();

      if (request) {
        // Send notification (async)
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'refill_rejected',
            patient_id: request.patient_id,
            refill_request_id: refillRequestId,
            reason,
          },
        });
      }

      return { rejected: true };
    } catch (error) {
      console.error('Reject refill error:', sanitizeForLog(error));
      throw error;
    }
  }

  /**
   * Send refill to pharmacy
   */
  static async dispenseRefill(
    refillRequestId: string,
    hospitalId: string,
    pharmacyId: string
  ): Promise<{ dispensed: boolean; error?: string }> {
    try {
      // Get refill request
      const { data: request, error: reqError } = await supabase
        .from('prescription_refill_requests')
        .select('*')
        .eq('id', refillRequestId)
        .eq('hospital_id', hospitalId)
        .single();

      if (reqError || !request) {
        return { dispensed: false, error: 'Refill request not found' };
      }

      // Update prescription refills_remaining
      const { error: updateError } = await supabase
        .from('prescriptions')
        .update({
          refills_remaining: supabase.rpc('decrement_refills', {
            prescription_id: request.prescription_id,
          }),
          last_refilled_at: new Date().toISOString(),
        })
        .eq('id', request.prescription_id);

      if (updateError) {
        console.error('Update prescription error:', sanitizeForLog(updateError));
        return { dispensed: false, error: updateError.message };
      }

      // Mark refill as dispensed
      const { error: dispenseError } = await supabase
        .from('prescription_refill_requests')
        .update({
          status: RefillStatus.DISPENSED,
          dispensed_at: new Date().toISOString(),
          dispensed_by: pharmacyId,
        })
        .eq('id', refillRequestId);

      if (dispenseError) {
        return { dispensed: false, error: dispenseError.message };
      }

      return { dispensed: true };
    } catch (error) {
      console.error('Dispense refill error:', sanitizeForLog(error));
      throw error;
    }
  }

  /**
   * Enable auto-refill for prescription
   */
  static async enableAutoRefill(
    prescriptionId: string,
    hospitalId: string,
    policy: RefillPolicy
  ): Promise<{ enabled: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('prescription_auto_refill_policies')
        .upsert({
          prescription_id: prescriptionId,
          hospital_id: hospitalId,
          auto_refill_enabled: true,
          refill_days_before_expiry: policy.refill_days_before_expiry,
          max_refills_per_year: policy.max_refills_per_year,
          require_doctor_approval: policy.require_doctor_approval,
          insurance_preauth_required: policy.insurance_preauth_required,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        return { enabled: false, error: error.message };
      }

      console.log('Auto-refill enabled:', sanitizeForLog({ prescription_id: prescriptionId }));
      return { enabled: true };
    } catch (error) {
      console.error('Enable auto-refill error:', sanitizeForLog(error));
      throw error;
    }
  }

  /**
   * Disable auto-refill for prescription
   */
  static async disableAutoRefill(
    prescriptionId: string,
    hospitalId: string
  ): Promise<{ disabled: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('prescription_auto_refill_policies')
        .update({ auto_refill_enabled: false })
        .eq('prescription_id', prescriptionId)
        .eq('hospital_id', hospitalId);

      if (error) {
        return { disabled: false, error: error.message };
      }

      return { disabled: true };
    } catch (error) {
      console.error('Disable auto-refill error:', sanitizeForLog(error));
      throw error;
    }
  }

  /**
   * Get refill history for prescription
   */
  static async getRefillHistory(
    prescriptionId: string,
    hospitalId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('prescription_refill_requests')
        .select('*')
        .eq('prescription_id', prescriptionId)
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Refill history query error:', sanitizeForLog(error));
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Refill history error:', sanitizeForLog(error));
      return [];
    }
  }
}

export default PrescriptionRefillManager;
