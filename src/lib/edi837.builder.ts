/**
 * EDI 837 Healthcare Claim Generation
 * Format: ANSI X12 EDI 837 Professional Healthcare Claim v005010
 */

export interface ClaimheaderData {
  claimNumber: string;
  patientVersion: string;
  submitterId: string;
  submitterName: string;
  receiverId: string;
  receiverName: string;
  submissionDate: Date;
}

export interface PatientData {
  firstName: string;
  lastName: string;
  dob: Date;
  gender: "M" | "F";
  memberId: string;
  groupNumber?: string;
}

export interface ProviderData {
  npnumber: string;
  lastName: string;
  firstName: string;
  taxId: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export interface ServiceData {
  procedureCode: string;
  diagnosisCode: string;
  serviceDate: Date;
  chargeAmount: number;
  unitsOfService: number;
  description: string;
}

/**
 * Format date as CCYYMMDD (EDI format)
 */
function formatEdiDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Format amount as ###.##
 */
function formatAmount(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

/**
 * Validate diagnosis code (ICD-10 format: ABC.### or ABC##)
 */
function validateDiagnosisCode(code: string): string {
  // Remove dots and validate
  const cleaned = code.replace(/\./g, "");
  if (!/^[A-Z][A-Z0-9]{4,6}$/.test(cleaned)) {
    throw new Error(`Invalid diagnosis code: ${code}`);
  }
  return cleaned;
}

/**
 * Validate procedure code (CPT: 5 digits)
 */
function validateProcedureCode(code: string): string {
  const cleaned = code.replace(/\D/g, "");
  if (!/^\d{5}$/.test(cleaned)) {
    throw new Error(`Invalid procedure code: ${code}`);
  }
  return cleaned;
}

/**
 * Generate EDI 837 claim
 */
export function generateEdi837Claim(
  header: ClaimheaderData,
  patient: PatientData,
  billing Provider: ProviderData,
  renderingProvider: ProviderData,
  service: ServiceData
): string {
  const lines: string[] = [];
  const controlNumber = Math.random().toString(36).substring(2, 11).toUpperCase();
  const submissionDate = formatEdiDate(header.submissionDate);
  const serviceDate = formatEdiDate(service.serviceDate);
  const patientDOB = formatEdiDate(patient.dob);

  // ISA: Interchange Control Header
  lines.push(
    `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *${submissionDate}*1200*^*00501*000000001*0*T*:`
  );

  // GS: Functional Group Header
  lines.push(
    `GS*HC*${header.submitterId}*${header.receiverId}*${submissionDate}*1200*1*X*005010X222A1`
  );

  // ST: Transaction Set Header
  lines.push(`ST*837*0001*005010X222A1`);

  // BHT: Beginning of Hierarchical Transaction
  lines.push(
    `BHT*0019*00*${header.claimNumber}*${submissionDate}*1200*CH`
  );

  // NM1: Submitter Name
  lines.push(
    `NM1*41*2*${header.submitterName}*****46*${header.submitterId}`
  );

  // PER: Submitter Contact Information
  lines.push(`PER*IC**TE*5551234567`);

  // NM1: Receiver
  lines.push(
    `NM1*40*2*${header.receiverName}*****46*${header.receiverId}`
  );

  // HL: Billing Provider Hierarchical Level
  lines.push(`HL*1**20*1`);

  // NM1: Billing Provider
  lines.push(
    `NM1*85*2*${billingProvider.lastName}*${billingProvider.firstName}*****XX*${billingProvider.npnumber}`
  );

  // N3: Billing Provider Address
  lines.push(`N3*${billingProvider.streetAddress}`);

  // N4: Billing Provider City/State/ZIP
  lines.push(
    `N4*${billingProvider.city}*${billingProvider.state}*${billingProvider.zip}`
  );

  // REF: Billing Provider Tax ID
  lines.push(`REF*EI*${billingProvider.taxId}`);

  // HL: Subscriber Hierarchical Level
  lines.push(`HL*2*1*22*0`);

  // SBR: Subscriber Information
  lines.push(
    `SBR*P*18*${patient.groupNumber}****11*B**B*B**B`
  );

  // NM1: Subscriber (Patient)
  lines.push(
    `NM1*IL*1*${patient.lastName}*${patient.firstName}***8*${patient.memberId}`
  );

  // DMG: Subscriber Demographic Information
  lines.push(`DMG*D8*${patientDOB}*${patient.gender}`);

  // HL: Claim-Level Patient
  lines.push(`HL*3*2*23*0`);

  // PAT: Patient Information
  lines.push(`PAT*19`);

  // NM1: Patient Name
  lines.push(
    `NM1*QC*1*${patient.lastName}*${patient.firstName}***8*${patient.memberId}`
  );

  // CLM: Claim Information
  const diagCode = validateDiagnosisCode(service.diagnosisCode);
  lines.push(
    `CLM*${header.claimNumber}*${formatAmount(service.chargeAmount)}*11*12*${service.serviceDate.getDate()}*${service.serviceDate.getMonth() + 1}*${service.serviceDate.getFullYear()}****11*B*0*N*F*I`
  );

  // DTP: Service Date
  lines.push(`DTP*472*D8*${serviceDate}`);

  // CL1: Claim Codes
  lines.push(`CL1*11*B*01`);

  // SVD: Service Line Detail
  const procCode = validateProcedureCode(service.procedureCode);
  lines.push(
    `SVC*HC*${procCode}*${formatAmount(service.chargeAmount)}*${formatAmount(service.chargeAmount)}*7*1*0`
  );

  // DTM: Service Date
  lines.push(`DTM*150*${serviceDate}`);

  // PLB: Provider Adjustment
  lines.push(`PLB*${header.submitterId}*${submissionDate}*0*0`);

  // SE: Transaction Set Trailer
  lines.push(`SE*${lines.length + 1}*0001`);

  // GE: Functional Group Trailer
  lines.push(`GE*1*1`);

  // IEA: Interchange Control Trailer
  lines.push(`IEA*1*000000001`);

  return lines.join("\n");
}

/**
 * Validate EDI 837 claim format
 */
export function validateEdi837(claimData: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required segments
  const requiredSegments = ["ISA", "GS", "ST", "BHT", "CLM", "SE", "GE", "IEA"];
  requiredSegments.forEach(segment => {
    if (!claimData.includes(segment + "*")) {
      errors.push(`Missing required segment: ${segment}`);
    }
  });

  // Check segment order
  const isaIndex = claimData.indexOf("ISA*");
  const clmIndex = claimData.indexOf("CLM*");
  const seIndex = claimData.indexOf("SE*");

  if (isaIndex > clmIndex || clmIndex > seIndex) {
    errors.push("Segments in incorrect order");
  }

  // Validate amounts
  const amountPattern = /\*(\d+\.\d{2})\*/g;
  let match;
  while ((match = amountPattern.exec(claimData)) !== null) {
    const amount = parseFloat(match[1]);
    if (amount < 0) {
      errors.push(`Invalid negative amount: ${match[1]}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  generateEdi837Claim,
  validateEdi837,
  formatEdiDate,
  formatAmount,
  validateDiagnosisCode,
  validateProcedureCode,
};
