import { describe, it, expect } from 'vitest';

// T-74: Diagnosis summary rendering
// Validates that diagnosis summaries are formatted correctly without exposing raw IDs

interface Diagnosis {
  id: string;
  icd_code: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  is_primary: boolean;
}

function renderDiagnosisSummary(diagnoses: Diagnosis[]): string {
  if (!diagnoses?.length) return 'No diagnoses recorded';
  const primary = diagnoses.find(d => d.is_primary);
  const secondary = diagnoses.filter(d => !d.is_primary);
  const parts: string[] = [];
  if (primary) {
    parts.push(`Primary: ${primary.icd_code} — ${primary.description} (${primary.severity})`);
  }
  if (secondary.length) {
    parts.push(`Secondary (${secondary.length}): ${secondary.map(d => d.icd_code).join(', ')}`);
  }
  return parts.join(' | ');
}

function redactDiagnosisForPublic(d: Diagnosis): Omit<Diagnosis, 'id'> {
  const { id: _id, ...safe } = d;
  return safe;
}

const sampleDiagnoses: Diagnosis[] = [
  {
    id: 'dx-private-uuid-001',
    icd_code: 'J18.9',
    description: 'Pneumonia, unspecified organism',
    severity: 'moderate',
    is_primary: true,
  },
  {
    id: 'dx-private-uuid-002',
    icd_code: 'I10',
    description: 'Essential (primary) hypertension',
    severity: 'mild',
    is_primary: false,
  },
];

describe('Diagnosis Summary Rendering (T-74)', () => {
  it('renders empty state for no diagnoses', () => {
    expect(renderDiagnosisSummary([])).toBe('No diagnoses recorded');
  });

  it('includes primary diagnosis with ICD code and severity', () => {
    const summary = renderDiagnosisSummary(sampleDiagnoses);
    expect(summary).toContain('J18.9');
    expect(summary).toContain('moderate');
    expect(summary).toContain('Primary:');
  });

  it('lists secondary diagnoses by ICD code count', () => {
    const summary = renderDiagnosisSummary(sampleDiagnoses);
    expect(summary).toContain('Secondary (1):');
    expect(summary).toContain('I10');
  });

  it('does not expose internal database IDs in summary', () => {
    const summary = renderDiagnosisSummary(sampleDiagnoses);
    expect(summary).not.toContain('dx-private-uuid');
  });

  it('redactDiagnosisForPublic strips the id field', () => {
    const safe = redactDiagnosisForPublic(sampleDiagnoses[0]);
    expect('id' in safe).toBe(false);
    expect(safe.icd_code).toBe('J18.9');
  });

  it('handles single diagnosis with no secondary', () => {
    const summary = renderDiagnosisSummary([sampleDiagnoses[0]]);
    expect(summary).toContain('Primary:');
    expect(summary).not.toContain('Secondary');
  });
});
