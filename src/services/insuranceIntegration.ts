export type IndianInsuranceSchemeId = 'ayushman_bharat' | 'esi' | 'cghs';

export interface InsuranceSchemeDefinition {
  id: IndianInsuranceSchemeId;
  name: string;
  description: string;
  coveragePercentage: number;
  maxCoverageAmount?: number;
  copayAmount: number;
  deductibleAmount: number;
  requiresPreAuth: boolean;
  eligibilityNotes: string[];
}

export const INDIAN_INSURANCE_SCHEMES: InsuranceSchemeDefinition[] = [
  {
    id: 'ayushman_bharat',
    name: 'Ayushman Bharat (PM-JAY)',
    description: 'Government-funded health insurance scheme for eligible families.',
    coveragePercentage: 90,
    maxCoverageAmount: 500000,
    copayAmount: 0,
    deductibleAmount: 0,
    requiresPreAuth: true,
    eligibilityNotes: ['SECC-based eligibility', 'Covers secondary and tertiary care'],
  },
  {
    id: 'esi',
    name: 'Employee State Insurance (ESI)',
    description: 'Social security scheme for employees and dependents.',
    coveragePercentage: 85,
    copayAmount: 10,
    deductibleAmount: 0,
    requiresPreAuth: false,
    eligibilityNotes: ['Requires insured person number', 'Covers dependents'],
  },
  {
    id: 'cghs',
    name: 'Central Government Health Scheme (CGHS)',
    description: 'Healthcare scheme for central government employees and pensioners.',
    coveragePercentage: 80,
    copayAmount: 0,
    deductibleAmount: 0,
    requiresPreAuth: true,
    eligibilityNotes: ['Requires CGHS card', 'Covers defined empanelled services'],
  },
];

export const normalizeInsuranceProvider = (providerName?: string | null) =>
  providerName?.trim().toLowerCase() ?? '';

export const resolveIndianScheme = (
  providerName?: string | null
): InsuranceSchemeDefinition | null => {
  const normalized = normalizeInsuranceProvider(providerName);
  return (
    INDIAN_INSURANCE_SCHEMES.find((scheme) =>
      [scheme.id, scheme.name.toLowerCase()].some((token) => normalized.includes(token))
    ) ?? null
  );
};

export interface EligibilityResponse {
  eligible: boolean;
  coverage: number;
  copay: number;
  deductible: number;
  deductibleMet: number;
  message: string;
  scheme?: InsuranceSchemeDefinition | null;
  requiresPreAuth?: boolean;
}

export interface ClaimSubmissionPayload {
  patient_id: string;
  policy_number: string;
  provider_name: string;
  service_codes: string[];
  total_amount: number;
  service_date: string;
  diagnosis_codes: string[];
}

export interface ClaimSubmissionResult {
  claim_id: string;
  status: string;
  confirmation_number?: string;
  estimated_processing_days?: number;
}

export interface ClaimStatusResult {
  claim_id: string;
  status: string;
  processed_date?: string;
  approved_amount?: number;
  patient_responsibility?: number;
  payment_date?: string;
  denial_reason?: string | null;
}

export interface ClaimValidationResult {
  adjustedAmount: number;
  warnings: string[];
}

export const validateClaimForScheme = (
  scheme: InsuranceSchemeDefinition | null,
  claimAmount: number
): ClaimValidationResult => {
  if (!scheme) {
    return { adjustedAmount: claimAmount, warnings: [] };
  }

  const warnings: string[] = [];
  let adjustedAmount = claimAmount;

  if (scheme.maxCoverageAmount && claimAmount > scheme.maxCoverageAmount) {
    warnings.push(
      `${scheme.name} has a maximum coverage amount of ₹${scheme.maxCoverageAmount.toLocaleString()}. Claim amount adjusted.`
    );
    adjustedAmount = scheme.maxCoverageAmount;
  }

  if (scheme.requiresPreAuth) {
    warnings.push(`${scheme.name} requires pre-authorization before claim submission.`);
  }

  return { adjustedAmount, warnings };
};
