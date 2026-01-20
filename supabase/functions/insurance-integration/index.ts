import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InsuranceClaim {
  patient_id: string;
  policy_number: string;
  provider_name: string;
  service_codes: string[];
  total_amount: number;
  service_date: string;
  diagnosis_codes: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = (globalThis as any).Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = (globalThis as any).Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, data } = await req.json();

    switch (action) {
      case 'verify_eligibility':
        return await verifyInsuranceEligibility(supabase, data);
      case 'submit_claim':
        return await submitInsuranceClaim(supabase, data);
      case 'check_claim_status':
        return await checkClaimStatus(supabase, data);
      case 'process_payment':
        return await processInsurancePayment(supabase, data);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

async function verifyInsuranceEligibility(supabase: any, { patient_id, policy_number }: any) {
  // Mock insurance verification - in production, integrate with actual insurance APIs
  const eligibilityResponse = {
    eligible: true,
    coverage_type: "comprehensive",
    copay_amount: 25.00,
    deductible_remaining: 500.00,
    coverage_percentage: 80,
    effective_date: "2024-01-01",
    expiration_date: "2024-12-31",
    prior_authorization_required: false,
  };

  // Store verification result
  const { error } = await supabase
    .from('insurance_verifications')
    .insert({
      patient_id,
      policy_number,
      verification_date: new Date().toISOString(),
      eligible: eligibilityResponse.eligible,
      coverage_details: eligibilityResponse,
    });

  if (error) throw error;

  return new Response(
    JSON.stringify(eligibilityResponse),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function submitInsuranceClaim(supabase: any, claim: InsuranceClaim) {
  const claimId = crypto.randomUUID();
  
  // Generate EDI 837 format (simplified)
  const ediClaim = {
    claim_id: claimId,
    transaction_set: "837P",
    patient_id: claim.patient_id,
    policy_number: claim.policy_number,
    provider_npi: "1234567890",
    service_lines: claim.service_codes.map((code, index) => ({
      line_number: index + 1,
      procedure_code: code,
      diagnosis_pointer: "1",
      charge_amount: claim.total_amount / claim.service_codes.length,
      service_date: claim.service_date,
    })),
    diagnosis_codes: claim.diagnosis_codes,
    total_charge: claim.total_amount,
  };

  // Store claim in database
  const { error } = await supabase
    .from('insurance_claims')
    .insert({
      id: claimId,
      patient_id: claim.patient_id,
      policy_number: claim.policy_number,
      provider_name: claim.provider_name,
      service_codes: claim.service_codes,
      diagnosis_codes: claim.diagnosis_codes,
      total_amount: claim.total_amount,
      service_date: claim.service_date,
      status: 'submitted',
      edi_data: ediClaim,
      submitted_at: new Date().toISOString(),
    });

  if (error) throw error;

  // Mock submission to insurance - in production, send to actual clearinghouse
  const submissionResponse = {
    claim_id: claimId,
    status: "submitted",
    confirmation_number: `CONF-${Date.now()}`,
    estimated_processing_days: 14,
  };

  return new Response(
    JSON.stringify(submissionResponse),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function checkClaimStatus(supabase: any, { claim_id }: any) {
  const { data: claim, error } = await supabase
    .from('insurance_claims')
    .select('*')
    .eq('id', claim_id)
    .single();

  if (error) throw error;

  // Mock status check - in production, query insurance API
  const statusResponse = {
    claim_id,
    status: "processed",
    processed_date: new Date().toISOString(),
    approved_amount: claim.total_amount * 0.8, // 80% coverage
    patient_responsibility: claim.total_amount * 0.2,
    payment_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    denial_reason: null,
  };

  // Update claim status
  await supabase
    .from('insurance_claims')
    .update({
      status: statusResponse.status,
      processed_date: statusResponse.processed_date,
      approved_amount: statusResponse.approved_amount,
      patient_responsibility: statusResponse.patient_responsibility,
    })
    .eq('id', claim_id);

  return new Response(
    JSON.stringify(statusResponse),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

async function processInsurancePayment(supabase: any, { claim_id, payment_amount }: any) {
  const paymentId = crypto.randomUUID();
  
  // Record insurance payment
  const { error } = await supabase
    .from('insurance_payments')
    .insert({
      id: paymentId,
      claim_id,
      payment_amount,
      payment_date: new Date().toISOString(),
      payment_method: 'electronic_transfer',
      status: 'completed',
    });

  if (error) throw error;

  // Update billing record
  await supabase
    .from('billing')
    .update({
      insurance_paid: payment_amount,
      status: 'partially_paid',
      updated_at: new Date().toISOString(),
    })
    .eq('claim_id', claim_id);

  return new Response(
    JSON.stringify({
      payment_id: paymentId,
      status: 'completed',
      amount: payment_amount,
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

serve(handler);