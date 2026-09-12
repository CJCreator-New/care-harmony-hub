/**
 * Standard Clinical Laboratory Reference Ranges and Panic (Critical) Thresholds
 * Compliant with CLIA / CAP Critical Value reporting requirements.
 */

export interface LabParameterDefinition {
  readonly id: string;
  readonly name: string;
  readonly unit: string;
  readonly normalMin: number;
  readonly normalMax: number;
  readonly criticalLow?: number;
  readonly criticalHigh?: number;
  readonly description?: string;
}

export interface LabPanelDefinition {
  readonly panelId: string;
  readonly panelName: string;
  readonly category: string;
  readonly tubeColor: string;
  readonly parameters: readonly LabParameterDefinition[];
}

export type ParameterEvaluationStatus =
  'normal' | 'low' | 'high' | 'critical_low' | 'critical_high' | 'unspecified';

export interface ParameterEvaluationResult {
  readonly parameterId: string;
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly status: ParameterEvaluationStatus;
  readonly isCritical: boolean;
  readonly referenceRange: string;
  readonly alertMessage?: string;
}

export interface PanelEvaluationResult {
  readonly panelName: string;
  readonly results: readonly ParameterEvaluationResult[];
  readonly hasCriticalPanic: boolean;
  readonly criticalSummary: string;
  readonly formattedReport: string;
}

export const STANDARD_LAB_PANELS: Record<string, LabPanelDefinition> = {
  cbc: {
    panelId: 'cbc',
    panelName: 'Complete Blood Count (CBC)',
    category: 'Hematology',
    tubeColor: 'Lavender (K2 EDTA)',
    parameters: [
      {
        id: 'hgb',
        name: 'Hemoglobin (Hb)',
        unit: 'g/dL',
        normalMin: 12.0,
        normalMax: 17.5,
        criticalLow: 7.0,
        criticalHigh: 20.0,
      },
      {
        id: 'wbc',
        name: 'White Blood Cells (WBC)',
        unit: 'x10^3/µL',
        normalMin: 4.0,
        normalMax: 11.0,
        criticalLow: 2.0,
        criticalHigh: 30.0,
      },
      {
        id: 'plt',
        name: 'Platelet Count',
        unit: 'x10^3/µL',
        normalMin: 150,
        normalMax: 450,
        criticalLow: 20,
        criticalHigh: 1000,
      },
      {
        id: 'hct',
        name: 'Hematocrit (Hct)',
        unit: '%',
        normalMin: 36.0,
        normalMax: 50.0,
        criticalLow: 20.0,
        criticalHigh: 60.0,
      },
    ],
  },
  bmp: {
    panelId: 'bmp',
    panelName: 'Basic Metabolic Panel (BMP)',
    category: 'Biochemistry',
    tubeColor: 'Gold (SST Gel Separator)',
    parameters: [
      {
        id: 'k',
        name: 'Potassium (K+)',
        unit: 'mmol/L',
        normalMin: 3.5,
        normalMax: 5.1,
        criticalLow: 2.8,
        criticalHigh: 6.2,
      },
      {
        id: 'na',
        name: 'Sodium (Na+)',
        unit: 'mmol/L',
        normalMin: 135,
        normalMax: 145,
        criticalLow: 120,
        criticalHigh: 160,
      },
      {
        id: 'glu',
        name: 'Glucose (Fasting/Random)',
        unit: 'mg/dL',
        normalMin: 70,
        normalMax: 105,
        criticalLow: 45,
        criticalHigh: 450,
      },
      {
        id: 'cr',
        name: 'Serum Creatinine',
        unit: 'mg/dL',
        normalMin: 0.6,
        normalMax: 1.2,
        criticalHigh: 5.0,
      },
      {
        id: 'bun',
        name: 'Blood Urea Nitrogen (BUN)',
        unit: 'mg/dL',
        normalMin: 7,
        normalMax: 20,
        criticalHigh: 80,
      },
      {
        id: 'ca',
        name: 'Total Calcium',
        unit: 'mg/dL',
        normalMin: 8.5,
        normalMax: 10.5,
        criticalLow: 6.5,
        criticalHigh: 13.0,
      },
    ],
  },
  cardiac: {
    panelId: 'cardiac',
    panelName: 'Cardiac Biomarkers Panel',
    category: 'Biochemistry',
    tubeColor: 'Green (Lithium Heparin)',
    parameters: [
      {
        id: 'trop',
        name: 'Troponin I (High-Sensitivity)',
        unit: 'ng/mL',
        normalMin: 0.0,
        normalMax: 0.04,
        criticalHigh: 0.4,
      },
      {
        id: 'ckmb',
        name: 'Creatine Kinase-MB',
        unit: 'ng/mL',
        normalMin: 0.0,
        normalMax: 5.0,
        criticalHigh: 25.0,
      },
      {
        id: 'bnp',
        name: 'NT-proBNP',
        unit: 'pg/mL',
        normalMin: 0,
        normalMax: 125,
        criticalHigh: 900,
      },
    ],
  },
  coag: {
    panelId: 'coag',
    panelName: 'Coagulation Profile',
    category: 'Hematology',
    tubeColor: 'Light Blue (Sodium Citrate 3.2%)',
    parameters: [
      {
        id: 'inr',
        name: 'Prothrombin Time / INR',
        unit: 'INR',
        normalMin: 0.8,
        normalMax: 1.2,
        criticalHigh: 5.0,
      },
      {
        id: 'aptt',
        name: 'Activated Partial Thromboplastin (aPTT)',
        unit: 'seconds',
        normalMin: 25,
        normalMax: 35,
        criticalHigh: 100,
      },
    ],
  },
  lft: {
    panelId: 'lft',
    panelName: 'Liver Function Panel (LFT)',
    category: 'Biochemistry',
    tubeColor: 'Gold (SST Gel Separator)',
    parameters: [
      {
        id: 'alt',
        name: 'ALT (Alanine Aminotransferase)',
        unit: 'U/L',
        normalMin: 7,
        normalMax: 56,
        criticalHigh: 1000,
      },
      {
        id: 'ast',
        name: 'AST (Aspartate Aminotransferase)',
        unit: 'U/L',
        normalMin: 10,
        normalMax: 40,
        criticalHigh: 1000,
      },
      {
        id: 'bili',
        name: 'Total Bilirubin',
        unit: 'mg/dL',
        normalMin: 0.2,
        normalMax: 1.2,
        criticalHigh: 15.0,
      },
      { id: 'alp', name: 'Alkaline Phosphatase', unit: 'U/L', normalMin: 44, normalMax: 147 },
    ],
  },
};

export function matchLabPanel(testName: string): LabPanelDefinition | null {
  const lower = testName.toLowerCase().trim();
  if (
    lower.includes('cbc') ||
    lower.includes('blood count') ||
    lower.includes('hemoglobin') ||
    lower.includes('platelet')
  ) {
    return STANDARD_LAB_PANELS.cbc;
  }
  if (
    lower.includes('bmp') ||
    lower.includes('metabolic') ||
    lower.includes('electrolyte') ||
    lower.includes('potassium') ||
    lower.includes('glucose') ||
    lower.includes('creatinine')
  ) {
    return STANDARD_LAB_PANELS.bmp;
  }
  if (
    lower.includes('troponin') ||
    lower.includes('cardiac') ||
    lower.includes('bnp') ||
    lower.includes('ck-mb')
  ) {
    return STANDARD_LAB_PANELS.cardiac;
  }
  if (
    lower.includes('coag') ||
    lower.includes('pt') ||
    lower.includes('inr') ||
    lower.includes('aptt')
  ) {
    return STANDARD_LAB_PANELS.coag;
  }
  if (
    lower.includes('lft') ||
    lower.includes('liver') ||
    lower.includes('alt') ||
    lower.includes('ast') ||
    lower.includes('bilirubin')
  ) {
    return STANDARD_LAB_PANELS.lft;
  }
  return null;
}

export function evaluateNumericParameter(
  param: LabParameterDefinition,
  value: number
): ParameterEvaluationResult {
  let status: ParameterEvaluationStatus = 'normal';
  let isCritical = false;
  let alertMessage: string | undefined;

  if (param.criticalLow !== undefined && value <= param.criticalLow) {
    status = 'critical_low';
    isCritical = true;
    alertMessage = `CRITICAL PANIC LOW: ${param.name} is ${value} ${param.unit} (Threshold: <= ${param.criticalLow})`;
  } else if (param.criticalHigh !== undefined && value >= param.criticalHigh) {
    status = 'critical_high';
    isCritical = true;
    alertMessage = `CRITICAL PANIC HIGH: ${param.name} is ${value} ${param.unit} (Threshold: >= ${param.criticalHigh})`;
  } else if (value < param.normalMin) {
    status = 'low';
    alertMessage = `Abnormal Low: ${param.name} is ${value} ${param.unit} (Ref: ${param.normalMin} - ${param.normalMax})`;
  } else if (value > param.normalMax) {
    status = 'high';
    alertMessage = `Abnormal High: ${param.name} is ${value} ${param.unit} (Ref: ${param.normalMin} - ${param.normalMax})`;
  }

  return {
    parameterId: param.id,
    name: param.name,
    value,
    unit: param.unit,
    status,
    isCritical,
    referenceRange: `${param.normalMin} - ${param.normalMax} ${param.unit}`,
    alertMessage,
  };
}

export function evaluateLabPanel(
  panel: LabPanelDefinition,
  rawValues: Record<string, number | string | undefined | null>
): PanelEvaluationResult {
  const results: ParameterEvaluationResult[] = [];
  const criticalItems: string[] = [];
  const reportLines: string[] = [`=== ${panel.panelName} REPORT ===`];

  for (const param of panel.parameters) {
    const rawVal = rawValues[param.id];
    if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
      const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);
      if (Number.isFinite(numVal)) {
        const evalRes = evaluateNumericParameter(param, numVal);
        results.push(evalRes);

        const statusTag = evalRes.isCritical
          ? `[*** CRITICAL ${evalRes.status.toUpperCase()} ***]`
          : evalRes.status !== 'normal'
            ? `[${evalRes.status.toUpperCase()}]`
            : '[NORMAL]';

        reportLines.push(
          `${param.name}: ${numVal} ${param.unit} ${statusTag} (Ref: ${evalRes.referenceRange})`
        );

        if (evalRes.isCritical) {
          criticalItems.push(`${param.name} (${numVal} ${param.unit})`);
        }
      }
    }
  }

  const hasCriticalPanic = criticalItems.length > 0;
  const criticalSummary = hasCriticalPanic
    ? `CRITICAL PANIC VALUES DETECTED: ${criticalItems.join(', ')}`
    : 'All evaluated parameters within acceptable clinical limits.';

  reportLines.push('================================');
  if (hasCriticalPanic) {
    reportLines.push(criticalSummary);
    reportLines.push(
      'MANDATORY PROTOCOL: Immediate verbal read-back to attending physician required.'
    );
  }

  return {
    panelName: panel.panelName,
    results,
    hasCriticalPanic,
    criticalSummary,
    formattedReport: reportLines.join('\n'),
  };
}
