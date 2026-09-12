/**
 * radiologyWorkflowRules.ts
 * Clinical and Diagnostic Imaging Governance Engine
 *
 * Implements:
 * 1. Modality definitions, anatomical regions, and contrast protocols
 * 2. Pre-scan safety rules (Radiation protection, pregnancy screening, renal eGFR contrast clearance)
 * 3. DICOM / PACS Window/Level (W/L) tissue density presets
 * 4. Structured ACR (American College of Radiology) reporting lifecycle (Preliminary Wet Read vs Finalized)
 * 5. Critical Radiologic Findings (Panic Read) catalog and closed-loop verbal read-back verification (30-min SLA)
 */

export type ImagingModality = 'xray' | 'ct' | 'mri' | 'ultrasound' | 'mammography';

export type ContrastProtocol =
  'none' | 'iv_contrast' | 'oral_contrast' | 'iv_oral' | 'triple_phase';

export type AnatomicalRegion =
  | 'chest'
  | 'abdomen_pelvis'
  | 'brain_head'
  | 'spine_cervical'
  | 'spine_lumbar'
  | 'extremity_upper'
  | 'extremity_lower'
  | 'neck'
  | 'cardiac';

export interface ModalityConfig {
  id: ImagingModality;
  name: string;
  codePrefix: string;
  isIonizing: boolean;
  requiresRenalScreeningForContrast: boolean;
  requiresFerromagneticScreening: boolean;
  defaultViews: string[];
}

export const MODALITY_CONFIGS: Record<ImagingModality, ModalityConfig> = {
  xray: {
    id: 'xray',
    name: 'Plain Radiography (X-Ray)',
    codePrefix: 'XR',
    isIonizing: true,
    requiresRenalScreeningForContrast: false,
    requiresFerromagneticScreening: false,
    defaultViews: ['PA View', 'Lateral View', 'AP Supine'],
  },
  ct: {
    id: 'ct',
    name: 'Computed Tomography (CT)',
    codePrefix: 'CT',
    isIonizing: true,
    requiresRenalScreeningForContrast: true, // Iodinated contrast -> CIN risk
    requiresFerromagneticScreening: false,
    defaultViews: ['Axial Slices (1.25mm)', 'Coronal Reformat', 'Sagittal Reformat'],
  },
  mri: {
    id: 'mri',
    name: 'Magnetic Resonance Imaging (MRI)',
    codePrefix: 'MRI',
    isIonizing: false,
    requiresRenalScreeningForContrast: true, // Gadolinium -> NSF risk
    requiresFerromagneticScreening: true, // High-field magnet safety
    defaultViews: ['T1 Axial', 'T2 Axial', 'FLAIR', 'DWI / ADC', 'T1 Post-Contrast'],
  },
  ultrasound: {
    id: 'ultrasound',
    name: 'Diagnostic Ultrasound (US)',
    codePrefix: 'US',
    isIonizing: false,
    requiresRenalScreeningForContrast: false,
    requiresFerromagneticScreening: false,
    defaultViews: ['B-Mode Transverse', 'B-Mode Longitudinal', 'Color Doppler Flow'],
  },
  mammography: {
    id: 'mammography',
    name: 'Mammography (MG)',
    codePrefix: 'MG',
    isIonizing: true,
    requiresRenalScreeningForContrast: false,
    requiresFerromagneticScreening: false,
    defaultViews: ['Craniocaudal (CC)', 'Mediolateral Oblique (MLO)'],
  },
};

/**
 * DICOM / PACS Window / Level Presets (Hounsfield Units for CT & Grayscale Density)
 */
export interface WindowLevelPreset {
  id: string;
  name: string;
  windowWidth: number;
  windowCenter: number; // Level
  description: string;
}

export const DICOM_WINDOW_PRESETS: Record<string, WindowLevelPreset> = {
  lung: {
    id: 'lung',
    name: 'Lung',
    windowWidth: 1500,
    windowCenter: -600,
    description: 'Parenchymal lung tissue, nodules, infiltrates',
  },
  bone: {
    id: 'bone',
    name: 'Bone',
    windowWidth: 2000,
    windowCenter: 300,
    description: 'Cortical and trabecular osseous architecture, fractures',
  },
  soft_tissue: {
    id: 'soft_tissue',
    name: 'Soft Tissue',
    windowWidth: 400,
    windowCenter: 40,
    description: 'Mediastinum, abdominal viscera, muscle, lymph nodes',
  },
  brain: {
    id: 'brain',
    name: 'Brain',
    windowWidth: 80,
    windowCenter: 40,
    description: 'Gray-white differentiation, edema, masses',
  },
  stroke: {
    id: 'stroke',
    name: 'Stroke / Ischemia',
    windowWidth: 40,
    windowCenter: 40,
    description: 'High-contrast early ischemic acute stroke detection',
  },
  liver: {
    id: 'liver',
    name: 'Liver / Contrast',
    windowWidth: 150,
    windowCenter: 30,
    description: 'Hepatic parenchyma and contrast enhancement wash-in/out',
  },
};

/**
 * Pre-Scan Safety Screening Parameters
 */
export interface PreScanSafetyChecklist {
  patientAge: number;
  patientGender: 'male' | 'female' | 'other';
  modality: ImagingModality;
  contrastProtocol: ContrastProtocol;
  lmpDate?: string;
  pregnancyScreenResult?: 'negative' | 'not_pregnant' | 'pregnant' | 'not_applicable';
  egfrValue?: number; // mL/min/1.73m²
  serumCreatinine?: number; // mg/dL
  hasPacemaker?: boolean;
  hasCochlearImplant?: boolean;
  hasAneurysmClip?: boolean;
  hasFerromagneticForeignBody?: boolean;
  doseDlp?: number; // mGy*cm
  doseCtdiVol?: number; // mGy
}

export interface PreScanSafetyValidationResult {
  cleared: boolean;
  warnings: string[];
  blockers: string[];
}

/**
 * Evaluates patient pre-scan safety gates before image acquisition
 */
export function validatePreScanSafety(
  checklist: PreScanSafetyChecklist
): PreScanSafetyValidationResult {
  const warnings: string[] = [];
  const blockers: string[] = [];
  const config = MODALITY_CONFIGS[checklist.modality];

  // 1. Pregnancy screening for ionizing radiation (females aged 12-55)
  if (
    config.isIonizing &&
    checklist.patientGender === 'female' &&
    checklist.patientAge >= 12 &&
    checklist.patientAge <= 55
  ) {
    if (!checklist.pregnancyScreenResult || checklist.pregnancyScreenResult === 'not_applicable') {
      blockers.push(
        'Mandatory pregnancy verification required for women of childbearing age (12-55) prior to ionizing radiation.'
      );
    } else if (checklist.pregnancyScreenResult === 'pregnant') {
      blockers.push(
        'Patient is confirmed PREGNANT. Ionizing radiation is contraindicated without emergent obstetrician/radiologist risk-benefit waiver.'
      );
    }
  }

  // 2. Renal function clearance for IV Contrast (CIN & NSF prevention)
  const isContrastScan =
    checklist.contrastProtocol === 'iv_contrast' ||
    checklist.contrastProtocol === 'iv_oral' ||
    checklist.contrastProtocol === 'triple_phase';

  if (isContrastScan && config.requiresRenalScreeningForContrast) {
    if (checklist.egfrValue === undefined) {
      warnings.push(
        'Recent eGFR / Serum Creatinine not recorded. Renal function clearance strongly advised prior to IV contrast administration.'
      );
    } else {
      if (checklist.modality === 'ct') {
        // Iodinated contrast thresholds
        if (checklist.egfrValue < 30) {
          blockers.push(
            `Severe renal impairment (eGFR ${checklist.egfrValue} mL/min). IV iodinated contrast contraindicated due to high acute Contrast-Induced Nephropathy (CIN) risk.`
          );
        } else if (checklist.egfrValue < 45) {
          warnings.push(
            `Moderate renal impairment (eGFR ${checklist.egfrValue} mL/min). Administer IV pre-hydration protocol and monitor post-scan creatinine.`
          );
        }
      } else if (checklist.modality === 'mri') {
        // Gadolinium contrast thresholds (Nephrogenic Systemic Fibrosis)
        if (checklist.egfrValue < 30) {
          blockers.push(
            `Severe renal failure (eGFR ${checklist.egfrValue} mL/min). Gadolinium contrast contraindicated due to Nephrogenic Systemic Fibrosis (NSF) risk.`
          );
        }
      }
    }
  }

  // 3. Ferromagnetic screening for MRI
  if (config.requiresFerromagneticScreening) {
    if (checklist.hasPacemaker) {
      blockers.push(
        'Patient has cardiac PACEMAKER. MRI contraindicated due to lethal RF heating/lead dislocation risk unless certified MR-Conditional.'
      );
    }
    if (checklist.hasCochlearImplant) {
      blockers.push(
        'Patient has COCHLEAR IMPLANT. MRI contraindicated due to internal magnet displacement.'
      );
    }
    if (checklist.hasAneurysmClip) {
      blockers.push(
        'Patient has ferromagnetic CEREBRAL ANEURYSM CLIP. High torque displacement risk.'
      );
    }
    if (checklist.hasFerromagneticForeignBody) {
      blockers.push(
        'Suspected intraocular or metallic foreign body. Plain orbits X-ray clearance required before entering MRI zone 4.'
      );
    }
  }

  return {
    cleared: blockers.length === 0,
    warnings,
    blockers,
  };
}

/**
 * Critical Radiologic Findings (Panic Read) Standard Catalog
 */
export interface CriticalRadiologyFinding {
  code: string;
  name: string;
  urgency: 'stat' | 'urgent';
  recommendedAction: string;
}

export const CRITICAL_RADIOLOGY_FINDINGS: CriticalRadiologyFinding[] = [
  {
    code: 'PNEUMO-TENSION',
    name: 'Tension Pneumothorax',
    urgency: 'stat',
    recommendedAction: 'Immediate needle decompression / chest tube thoracostomy',
  },
  {
    code: 'ICH-ACUTE',
    name: 'Acute Intracranial Hemorrhage (Subdural / Epidural / SAH / IPH)',
    urgency: 'stat',
    recommendedAction: 'Immediate neurosurgery consult & hyperosmolar therapy',
  },
  {
    code: 'AORTIC-DISSECT',
    name: 'Acute Aortic Dissection / Ruptured Aneurysm',
    urgency: 'stat',
    recommendedAction: 'Immediate cardiothoracic surgical intervention & BP control',
  },
  {
    code: 'PE-MASSIVE',
    name: 'Massive / Saddle Pulmonary Embolism',
    urgency: 'stat',
    recommendedAction: 'Immediate PERT (Pulmonary Embolism Response Team) / Thrombolysis',
  },
  {
    code: 'PNEUMO-PERITONEUM',
    name: 'Pneumoperitoneum (Free Intraperitoneal Air)',
    urgency: 'stat',
    recommendedAction: 'Immediate exploratory laparotomy / general surgery consult',
  },
  {
    code: 'CORD-COMPRESS',
    name: 'Acute Spinal Cord Compression / Unstable Fracture',
    urgency: 'stat',
    recommendedAction: 'Emergent spinal immobilization & neurosurgery/spine consult',
  },
  {
    code: 'BOWEL-ISCHEMIA',
    name: 'Acute Mesenteric Ischemia / Pneumatosis Intestinalis',
    urgency: 'stat',
    recommendedAction: 'Urgent general surgery consult & broad-spectrum IV antibiotics',
  },
];

/**
 * Closed-Loop Verbal Read-Back Validation for Critical Findings
 */
export interface CriticalReadBackDetails {
  orderingDoctorName: string;
  doctorPhoneNumber: string;
  readBackConfirmed: boolean;
  calledAt: string;
  radiologistName: string;
}

export function validateCriticalReadBack(details: CriticalReadBackDetails): {
  valid: boolean;
  error?: string;
} {
  if (!details.orderingDoctorName || details.orderingDoctorName.trim().length < 3) {
    return {
      valid: false,
      error: 'Ordering physician name is required for closed-loop read-back.',
    };
  }
  if (!details.doctorPhoneNumber || details.doctorPhoneNumber.trim().length < 7) {
    return { valid: false, error: 'Direct telephone number called is required.' };
  }
  if (!details.readBackConfirmed) {
    return {
      valid: false,
      error:
        'Physician verbal read-back confirmation is required under Joint Commission / ACR standards.',
    };
  }
  return { valid: true };
}

/**
 * 30-Minute SLA Evaluation for Critical Finding Notification
 */
export function evaluateCriticalAlertSla(
  findingTime: string | Date,
  notifiedTime?: string | Date | null,
  referenceNow: Date = new Date()
): {
  slaMinutesRemaining: number;
  isBreached: boolean;
  isCompleted: boolean;
  statusLabel: string;
  badgeVariant: 'default' | 'secondary' | 'destructive';
} {
  const startMs = new Date(findingTime).getTime();
  const endMs = notifiedTime ? new Date(notifiedTime).getTime() : referenceNow.getTime();
  const elapsedMinutes = Math.floor((endMs - startMs) / (1000 * 60));

  if (notifiedTime) {
    const isBreached = elapsedMinutes > 30;
    return {
      slaMinutesRemaining: Math.max(0, 30 - elapsedMinutes),
      isBreached,
      isCompleted: true,
      statusLabel: isBreached
        ? `Read-Back Completed (${elapsedMinutes}m - SLA Breached)`
        : `Closed-Loop Confirmed (${elapsedMinutes}m)`,
      badgeVariant: isBreached ? 'destructive' : 'default',
    };
  }

  const remaining = 30 - elapsedMinutes;
  const isBreached = remaining < 0;

  return {
    slaMinutesRemaining: Math.max(0, remaining),
    isBreached,
    isCompleted: false,
    statusLabel: isBreached
      ? `SLA BREACHED (${Math.abs(remaining)}m overdue)`
      : `${remaining}m remaining to notify physician`,
    badgeVariant: isBreached ? 'destructive' : 'secondary',
  };
}
