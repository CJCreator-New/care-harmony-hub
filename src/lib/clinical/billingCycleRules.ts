/**
 * billingCycleRules.ts
 * Clinical and Revenue Cycle Governance Engine
 *
 * Implements:
 * 1. Standard hospital tariff lookup for unbilled clinical services
 * 2. ICD-10 diagnostic code format validation & standard reference list
 * 3. Insurance Pre-Authorization enforcement (> ₹25,000 or PMJAY / CGHS / ESIC)
 * 4. Multi-tender split payment balance and change computation
 * 5. Payment plan 14-day delinquency & grace period evaluation
 * 6. Audited invoice adjustments (dispute waivers, manager discounts, refunds)
 */

export interface ClinicalTariffItem {
  code: string;
  category: 'consultation' | 'lab' | 'medication' | 'bed' | 'procedure';
  name: string;
  unitPrice: number;
  description: string;
}

export const STANDARD_HOSPITAL_TARIFF: ClinicalTariffItem[] = [
  // Consultations
  {
    code: 'CON-OPD',
    category: 'consultation',
    name: 'General OPD Consultation',
    unitPrice: 500,
    description: 'Standard outpatient physician review',
  },
  {
    code: 'CON-SPEC',
    category: 'consultation',
    name: 'Specialist Consultation',
    unitPrice: 1000,
    description: 'Cardiology, Neurology, or Oncology review',
  },
  {
    code: 'CON-EMRG',
    category: 'consultation',
    name: 'Emergency Room Triage & Assessment',
    unitPrice: 1500,
    description: 'Emergency medical officer workup',
  },
  {
    code: 'CON-RND',
    category: 'consultation',
    name: 'Inpatient Daily Rounding Fee',
    unitPrice: 800,
    description: 'Attending physician daily inpatient visit',
  },

  // Laboratory Panels
  {
    code: 'LAB-CBC',
    category: 'lab',
    name: 'Complete Blood Count (CBC)',
    unitPrice: 350,
    description: 'Hemogram, WBC differential, Platelets',
  },
  {
    code: 'LAB-BMP',
    category: 'lab',
    name: 'Basic Metabolic Panel (BMP)',
    unitPrice: 450,
    description: 'Electrolytes, BUN, Creatinine, Glucose',
  },
  {
    code: 'LAB-CARD',
    category: 'lab',
    name: 'Cardiac Panel (Troponin I / T)',
    unitPrice: 1200,
    description: 'High-sensitivity quantitative troponin',
  },
  {
    code: 'LAB-COAG',
    category: 'lab',
    name: 'Coagulation Profile (PT/INR)',
    unitPrice: 400,
    description: 'Prothrombin time and international normalized ratio',
  },
  {
    code: 'LAB-LFT',
    category: 'lab',
    name: 'Liver Function Test (LFT)',
    unitPrice: 600,
    description: 'Bilirubin, SGOT/AST, SGPT/ALT, Alk Phos',
  },
  {
    code: 'LAB-LIPID',
    category: 'lab',
    name: 'Lipid Profile',
    unitPrice: 550,
    description: 'Total Cholesterol, HDL, LDL, Triglycerides',
  },
  {
    code: 'LAB-URINE',
    category: 'lab',
    name: 'Urinalysis Routine & Microscopy',
    unitPrice: 250,
    description: 'Urine chemical dipstick and microscopy',
  },
  {
    code: 'LAB-CULT',
    category: 'lab',
    name: 'Blood Culture & Sensitivity',
    unitPrice: 800,
    description: 'Automated aerobic/anaerobic blood culture',
  },

  // Common Pharmacy Dispensations
  {
    code: 'MED-AMOX',
    category: 'medication',
    name: 'Amoxicillin-Clavulanate 625mg',
    unitPrice: 140,
    description: 'Oral antibiotic strip (10 tablets)',
  },
  {
    code: 'MED-PARA',
    category: 'medication',
    name: 'Paracetamol 650mg',
    unitPrice: 30,
    description: 'Antipyretic/analgesic strip (10 tablets)',
  },
  {
    code: 'MED-METF',
    category: 'medication',
    name: 'Metformin 500mg Extended Release',
    unitPrice: 65,
    description: 'Oral hypoglycemic strip (10 tablets)',
  },
  {
    code: 'MED-ATOR',
    category: 'medication',
    name: 'Atorvastatin 20mg',
    unitPrice: 160,
    description: 'Lipid-lowering agent strip (10 tablets)',
  },
  {
    code: 'MED-CEFT',
    category: 'medication',
    name: 'Ceftriaxone 1g IV Vial',
    unitPrice: 320,
    description: 'Injectable 3rd gen cephalosporin',
  },
  {
    code: 'MED-PANT',
    category: 'medication',
    name: 'Pantoprazole 40mg IV Injection',
    unitPrice: 95,
    description: 'Injectable proton pump inhibitor',
  },
  {
    code: 'MED-NS500',
    category: 'medication',
    name: 'Normal Saline 0.9% 500ml IV',
    unitPrice: 120,
    description: 'Isotonic IV crystalloid infusion',
  },
  {
    code: 'MED-ONDA',
    category: 'medication',
    name: 'Ondansetron 4mg IV Ampoule',
    unitPrice: 45,
    description: 'Antiemetic injection',
  },

  // Inpatient Bed Accommodation (Daily rate)
  {
    code: 'BED-GEN',
    category: 'bed',
    name: 'General Ward Bed (Per Day)',
    unitPrice: 1500,
    description: 'Multi-occupancy inpatient bed including nursing care',
  },
  {
    code: 'BED-SEMI',
    category: 'bed',
    name: 'Semi-Private Room (Per Day)',
    unitPrice: 3500,
    description: 'Twin-sharing room with air conditioning',
  },
  {
    code: 'BED-ICU',
    category: 'bed',
    name: 'Intensive Care Unit (ICU) Bed (Per Day)',
    unitPrice: 8000,
    description: 'Continuous monitoring, ventilator support & critical care',
  },
  {
    code: 'BED-HDU',
    category: 'bed',
    name: 'High Dependency Unit (HDU) (Per Day)',
    unitPrice: 5000,
    description: 'Step-down high dependency monitoring',
  },
];

/**
 * Standard ICD-10 diagnostic codes frequently encountered in inpatient/outpatient care
 */
export interface StandardIcd10Code {
  code: string;
  description: string;
  category: string;
}

export const COMMON_ICD10_CODES: StandardIcd10Code[] = [
  { code: 'I10', description: 'Essential (primary) hypertension', category: 'Circulatory' },
  {
    code: 'E11.9',
    description: 'Type 2 diabetes mellitus without complications',
    category: 'Endocrine',
  },
  {
    code: 'E11.65',
    description: 'Type 2 diabetes mellitus with hyperglycemia',
    category: 'Endocrine',
  },
  { code: 'J18.9', description: 'Pneumonia, unspecified organism', category: 'Respiratory' },
  {
    code: 'I21.9',
    description: 'Acute myocardial infarction, unspecified',
    category: 'Circulatory',
  },
  {
    code: 'K21.9',
    description: 'Gastro-esophageal reflux disease without esophagitis',
    category: 'Digestive',
  },
  {
    code: 'A09',
    description: 'Infectious gastroenteritis and colitis, unspecified',
    category: 'Infectious',
  },
  { code: 'R07.9', description: 'Chest pain, unspecified', category: 'Symptoms' },
  {
    code: 'N39.0',
    description: 'Urinary tract infection, site not specified',
    category: 'Genitourinary',
  },
  {
    code: 'S82.90XA',
    description: 'Unspecified fracture of lower leg, initial encounter',
    category: 'Injury',
  },
  { code: 'J45.909', description: 'Unspecified asthma, uncomplicated', category: 'Respiratory' },
  { code: 'K35.80', description: 'Unspecified acute appendicitis', category: 'Digestive' },
];

/**
 * Validates whether an ICD-10 code adheres to standard format:
 * Letter (A-Z except U unless special) followed by 2 digits, optional decimal point and 1-4 alphanumeric characters.
 */
export function isValidIcd10Code(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const cleaned = code.trim().toUpperCase();
  const icd10Regex = /^[A-TV-Z][0-9][0-9AB](?:\.[0-9A-KXZ]{1,4})?$/;
  return icd10Regex.test(cleaned);
}

/**
 * Resolves standard clinical tariff for a given service code or name
 */
export function resolveTariffRate(
  serviceNameOrCode: string,
  category?: ClinicalTariffItem['category']
): ClinicalTariffItem {
  const normalized = serviceNameOrCode.toLowerCase().trim();

  const exactMatch = STANDARD_HOSPITAL_TARIFF.find(
    (item) => item.code.toLowerCase() === normalized || item.name.toLowerCase() === normalized
  );
  if (exactMatch) return exactMatch;

  const partialMatch = STANDARD_HOSPITAL_TARIFF.find(
    (item) =>
      (!category || item.category === category) &&
      (normalized.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(normalized))
  );
  if (partialMatch) return partialMatch;

  // Fallback defaults by category
  const fallbackRates: Record<ClinicalTariffItem['category'], number> = {
    consultation: 500,
    lab: 400,
    medication: 100,
    bed: 2000,
    procedure: 1500,
  };

  const resolvedCategory = category || 'procedure';
  return {
    code: `CUSTOM-${Date.now().toString(36).slice(-4).toUpperCase()}`,
    category: resolvedCategory,
    name: serviceNameOrCode,
    unitPrice: fallbackRates[resolvedCategory],
    description: 'Custom clinical service charge',
  };
}

/**
 * Checks if an insurance claim requires pre-authorization.
 * Mandatory if:
 * 1. Payer is a government scheme (PMJAY / Ayushman Bharat, CGHS, ESIC)
 * 2. Claim total >= ₹25,000 (standard high-cost threshold)
 */
export function isPreAuthRequired(insuranceProvider: string, claimAmount: number): boolean {
  if (!insuranceProvider) return false;
  const p = insuranceProvider.toLowerCase().trim();
  const governmentSchemes = ['pmjay', 'ayushman bharat', 'cghs', 'esic', 'cghs / esic'];
  const isGovScheme = governmentSchemes.some((scheme) => p.includes(scheme));
  return isGovScheme || claimAmount >= 25000;
}

/**
 * Validates pre-authorization code syntax (min 6 alphanumeric chars, no whitespace)
 */
export function isValidPreAuthNumber(preAuthNumber: string | null | undefined): boolean {
  if (!preAuthNumber) return false;
  const cleaned = preAuthNumber.trim();
  return /^[A-Z0-9-]{6,25}$/i.test(cleaned);
}

/**
 * Multi-tender payment calculation
 */
export interface SplitTenderItem {
  id: string;
  method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'insurance';
  amount: number;
  referenceNumber?: string;
  notes?: string;
}

export interface SplitPaymentSummary {
  invoiceBalance: number;
  totalTendered: number;
  remainingBalance: number;
  changeDue: number;
  isFullySettled: boolean;
  hasErrors: boolean;
  errorMessage?: string;
}

export function calculateSplitPaymentSummary(
  balance: number,
  tenders: SplitTenderItem[]
): SplitPaymentSummary {
  const safeBalance = Math.max(0, balance);
  const totalTendered = tenders.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Check for invalid tenders (non-positive or missing ref for electronic tenders)
  let hasErrors = false;
  let errorMessage = '';

  for (const t of tenders) {
    if (!t.amount || t.amount <= 0) {
      hasErrors = true;
      errorMessage = 'Every payment line must have an amount greater than ₹0.';
      break;
    }
    if (
      (t.method === 'card' || t.method === 'upi' || t.method === 'bank_transfer') &&
      !t.referenceNumber?.trim()
    ) {
      hasErrors = true;
      errorMessage = `Reference/Transaction ID is required for ${t.method.toUpperCase()} payments.`;
      break;
    }
  }

  const cashTenders = tenders.filter((t) => t.method === 'cash');
  const totalCash = cashTenders.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const nonCashTotal = totalTendered - totalCash;

  // Non-cash tenders cannot exceed balance
  if (nonCashTotal > safeBalance + 0.01) {
    hasErrors = true;
    errorMessage = 'Electronic tenders (Card, UPI, Bank Transfer) cannot exceed balance due.';
  }

  const remainingBalance = Math.max(0, safeBalance - totalTendered);
  const changeDue = totalTendered > safeBalance && totalCash > 0 ? totalTendered - safeBalance : 0;
  const isFullySettled = totalTendered >= safeBalance && !hasErrors;

  return {
    invoiceBalance: safeBalance,
    totalTendered,
    remainingBalance,
    changeDue,
    isFullySettled,
    hasErrors,
    errorMessage: errorMessage || undefined,
  };
}

/**
 * Evaluates payment plan status including 14-day delinquency grace period
 */
export interface PaymentPlanDelinquencyResult {
  status: 'active' | 'grace_period' | 'defaulted' | 'completed' | 'cancelled';
  daysOverdue: number;
  label: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  isDelinquent: boolean;
}

export function evaluatePaymentPlanDelinquency(
  plan: {
    status: string;
    next_due_date?: string | null;
    remaining_balance?: number;
  },
  referenceDate: Date = new Date()
): PaymentPlanDelinquencyResult {
  if (
    plan.status === 'completed' ||
    (plan.remaining_balance !== undefined && plan.remaining_balance <= 0)
  ) {
    return {
      status: 'completed',
      daysOverdue: 0,
      label: 'Completed',
      badgeVariant: 'secondary',
      isDelinquent: false,
    };
  }

  if (plan.status === 'cancelled') {
    return {
      status: 'cancelled',
      daysOverdue: 0,
      label: 'Cancelled',
      badgeVariant: 'outline',
      isDelinquent: false,
    };
  }

  if (!plan.next_due_date) {
    return {
      status: 'active',
      daysOverdue: 0,
      label: 'Active',
      badgeVariant: 'default',
      isDelinquent: false,
    };
  }

  const dueDate = new Date(plan.next_due_date);
  dueDate.setHours(0, 0, 0, 0);
  const checkDate = new Date(referenceDate);
  checkDate.setHours(0, 0, 0, 0);

  const diffMs = checkDate.getTime() - dueDate.getTime();
  const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysOverdue <= 0) {
    return {
      status: 'active',
      daysOverdue: 0,
      label: 'Active',
      badgeVariant: 'default',
      isDelinquent: false,
    };
  }

  // Overdue up to 14 days is in Grace Period
  if (daysOverdue <= 14) {
    return {
      status: 'grace_period',
      daysOverdue,
      label: `In Grace Period (${daysOverdue}d overdue)`,
      badgeVariant: 'secondary',
      isDelinquent: false,
    };
  }

  // Overdue > 14 days is Defaulted
  return {
    status: 'defaulted',
    daysOverdue,
    label: `Defaulted (${daysOverdue}d overdue)`,
    badgeVariant: 'destructive',
    isDelinquent: true,
  };
}

/**
 * Invoice Adjustments & Refunds Validation
 */
export interface InvoiceAdjustmentParams {
  type: 'dispute_waiver' | 'manager_discount' | 'refund';
  amount: number;
  reason: string;
  managerAuthorized: boolean;
  managerName?: string;
}

export function validateInvoiceAdjustment(
  invoice: {
    total: number;
    paid_amount: number;
    status: string;
  },
  adjustment: InvoiceAdjustmentParams
): {
  valid: boolean;
  error?: string;
  newTotal?: number;
  newBalance?: number;
  refundAmount?: number;
} {
  const balance = invoice.total - invoice.paid_amount;

  if (adjustment.amount <= 0) {
    return { valid: false, error: 'Adjustment amount must be greater than ₹0.' };
  }

  if (!adjustment.reason || adjustment.reason.trim().length < 5) {
    return {
      valid: false,
      error: 'A valid clinical or financial justification (min 5 characters) is required.',
    };
  }

  switch (adjustment.type) {
    case 'dispute_waiver':
      if (adjustment.amount > balance) {
        return {
          valid: false,
          error: `Dispute waiver cannot exceed the remaining balance of ₹${balance.toFixed(2)}.`,
        };
      }
      return {
        valid: true,
        newTotal: invoice.total - adjustment.amount,
        newBalance: balance - adjustment.amount,
      };

    case 'manager_discount':
      if (!adjustment.managerAuthorized) {
        return {
          valid: false,
          error: 'Manager authorization is required to apply concessions or discounts.',
        };
      }
      if (adjustment.amount > invoice.total * 0.5) {
        return {
          valid: false,
          error: 'Manager discount cannot exceed 50% of the original invoice total.',
        };
      }
      if (adjustment.amount > balance) {
        return {
          valid: false,
          error: `Discount cannot exceed the remaining balance of ₹${balance.toFixed(2)}.`,
        };
      }
      return {
        valid: true,
        newTotal: invoice.total - adjustment.amount,
        newBalance: balance - adjustment.amount,
      };

    case 'refund':
      if (invoice.paid_amount <= 0) {
        return { valid: false, error: 'No payments have been made on this invoice to refund.' };
      }
      if (adjustment.amount > invoice.paid_amount) {
        return {
          valid: false,
          error: `Refund cannot exceed the total amount paid (₹${invoice.paid_amount.toFixed(2)}).`,
        };
      }
      return {
        valid: true,
        refundAmount: adjustment.amount,
        newBalance: balance + adjustment.amount,
      };

    default:
      return { valid: false, error: 'Invalid adjustment type.' };
  }
}
