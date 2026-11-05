/**
 * Pure logic for the Critical Lab Escalation Queue (roadmap S0-08, EDGE-03 / CLIN-10).
 *
 * Used by supabase/functions/critical-lab-check/index.ts and unit-tested from
 * tests/critical-lab/ (same pattern as _shared/errorHandler.ts). This file must
 * stay free of imports, I/O and Deno/Node globals so it runs in both runtimes.
 *
 * Contents:
 *   - request validation for the three actions (create alert, acknowledge, worker)
 *   - analyte value parsing and grading, failing closed
 *   - built-in default critical thresholds (mirror of the UI's STANDARD_LAB_PANELS)
 *   - escalation ladder schedule (primary 0 min, on-call 5 min, ED 10 min)
 *   - dispatch outcome / retry policy for the worker
 *   - constant-time comparison for the worker's shared secret
 */

// ---------------------------------------------------------------------------
// Vocabularies (must match the CHECK constraints in
// supabase/pending-migrations/20261105000001_critical_lab_escalation_queue.sql)
// ---------------------------------------------------------------------------

export const ALERT_SEVERITIES = ['critical_high', 'critical_low', 'warning', 'review_required'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ESCALATION_LEVELS = ['primary', 'on_call', 'er'] as const;
export type EscalationLevel = (typeof ESCALATION_LEVELS)[number];

export const ESCALATION_STATUSES = [
  'pending',
  'processing',
  'dispatched',
  'acknowledged',
  'cancelled',
  'failed',
] as const;
export type EscalationStatus = (typeof ESCALATION_STATUSES)[number];

/** Minutes after alert creation at which each level is notified (ADR-0005 §4). */
export const ESCALATION_DELAY_MINUTES: Readonly<Record<EscalationLevel, number>> = {
  primary: 0,
  on_call: 5,
  er: 10,
};

/** Worker retry policy for a level whose dispatch reached nobody. */
export const MAX_DISPATCH_ATTEMPTS = 3;
export const RETRY_DELAY_MINUTES = 1;
/** A row stuck in 'processing' longer than this is reclaimed (worker crashed mid-dispatch). */
export const PROCESSING_LEASE_MINUTES = 2;

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

export type AnalyteGrade = 'critical_low' | 'critical_high' | 'warning' | 'normal' | 'review_required';

export interface CriticalRange {
  readonly critical_low?: number | null;
  readonly critical_high?: number | null;
  readonly warning_low?: number | null;
  readonly warning_high?: number | null;
  readonly unit?: string | null;
  /** Where the range came from: hospital configuration or the built-in default. */
  readonly source: 'hospital' | 'default';
}

export interface AnalyteInput {
  readonly code: string;
  readonly name?: string;
  readonly value: number | string | null;
  readonly unit?: string;
}

export interface GradedAnalyte {
  readonly code: string;
  readonly name: string;
  readonly raw: string;
  readonly value: number | null;
  readonly unit: string | null;
  readonly grade: AnalyteGrade;
  readonly reason?: string;
  readonly rangeSource: CriticalRange['source'] | null;
}

/**
 * Parses a lab value strictly. Only a plain finite decimal is accepted.
 * Qualified values ("<0.01", ">500"), text ("hemolysed"), blanks and
 * locale formats return null, and the caller must treat null as "cannot grade".
 */
export function parseAnalyteValue(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const UNIT_EQUIVALENTS: ReadonlyArray<ReadonlySet<string>> = [
  new Set(['mmol/l', 'meq/l']),
  new Set(['x10^3/µl', 'x10^3/ul', 'k/ul', '10^3/ul', 'x10^9/l', '10^9/l']),
];

function normalizeUnit(u: string): string {
  return u.trim().toLowerCase().replace(/\s+/g, '').replace('μ', 'µ');
}

/** True when both units are known and denote different scales. Unknown/missing units are not a mismatch. */
export function unitsConflict(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const na = normalizeUnit(a);
  const nb = normalizeUnit(b);
  if (na === nb) return false;
  return !UNIT_EQUIVALENTS.some((set) => set.has(na) && set.has(nb));
}

function isNum(x: number | null | undefined): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

/**
 * Grades one analyte against a range. Thresholds are inclusive (value <= low or
 * >= high is critical), matching the UI's evaluateNumericParameter. Any input
 * that cannot be graded returns 'review_required' (fail closed), never 'normal'.
 */
export function gradeAnalyte(input: AnalyteInput, range: CriticalRange | null): GradedAnalyte {
  const raw = input.value === null || input.value === undefined ? '' : String(input.value);
  const value = parseAnalyteValue(input.value);
  const base = {
    code: input.code,
    name: input.name?.trim() || input.code,
    raw,
    value,
    unit: input.unit?.trim() || range?.unit || null,
    rangeSource: range?.source ?? null,
  };

  if (value === null) {
    return { ...base, grade: 'review_required', reason: 'unparseable_value' };
  }
  if (!range || (!isNum(range.critical_low) && !isNum(range.critical_high))) {
    return { ...base, grade: 'review_required', reason: 'no_critical_range_configured' };
  }
  if (unitsConflict(input.unit, range.unit)) {
    return { ...base, grade: 'review_required', reason: 'unit_mismatch' };
  }
  if (isNum(range.critical_low) && value <= range.critical_low) {
    return { ...base, grade: 'critical_low' };
  }
  if (isNum(range.critical_high) && value >= range.critical_high) {
    return { ...base, grade: 'critical_high' };
  }
  if ((isNum(range.warning_low) && value < range.warning_low) || (isNum(range.warning_high) && value > range.warning_high)) {
    return { ...base, grade: 'warning' };
  }
  return { ...base, grade: 'normal' };
}

export interface ResultDecision {
  /** True when an alert row and an escalation ladder must be created. */
  readonly requiresAlert: boolean;
  readonly severity: AlertSeverity | null;
  /** The analyte shown as the alert's test_code / result_value. */
  readonly headline: GradedAnalyte | null;
  readonly analytes: readonly GradedAnalyte[];
  readonly reasons: readonly string[];
}

/**
 * Combines graded analytes into one decision for the lab order.
 * - any critical analyte  -> severity of the first critical analyte
 * - else any review item  -> 'review_required'
 * - else manual flag set  -> 'review_required' (the technologist asserted a panic value)
 */
export function decideResult(analytes: readonly GradedAnalyte[], manualCritical: boolean): ResultDecision {
  const critical = analytes.find((a) => a.grade === 'critical_low' || a.grade === 'critical_high');
  const review = analytes.find((a) => a.grade === 'review_required');
  const reasons: string[] = [];
  for (const a of analytes) {
    if (a.grade === 'review_required') reasons.push(`${a.code}:${a.reason}`);
  }
  if (manualCritical) reasons.push('manual_critical_flag');

  if (critical) {
    return {
      requiresAlert: true,
      severity: critical.grade as AlertSeverity,
      headline: critical,
      analytes,
      reasons,
    };
  }
  if (review) {
    return { requiresAlert: true, severity: 'review_required', headline: review, analytes, reasons };
  }
  if (manualCritical) {
    return { requiresAlert: true, severity: 'review_required', headline: null, analytes, reasons };
  }
  return { requiresAlert: false, severity: null, headline: null, analytes, reasons };
}

// ---------------------------------------------------------------------------
// Ranges: hospital configuration first, then the built-in default
// ---------------------------------------------------------------------------

export interface DefaultThreshold {
  readonly code: string;
  readonly name: string;
  readonly unit: string;
  readonly loinc: readonly string[];
  readonly criticalLow?: number;
  readonly criticalHigh?: number;
  readonly normalMin: number;
  readonly normalMax: number;
}

/**
 * Built-in defaults, keyed by the analyte ids the Structured Result Entry modal
 * uses. They MUST equal the critical limits in
 * src/modules/critical-lab-escalation/core/labPanels.ts (STANDARD_LAB_PANELS);
 * a unit test enforces this so the UI and the server cannot drift.
 */
export const DEFAULT_THRESHOLDS: Readonly<Record<string, DefaultThreshold>> = {
  hgb: { code: 'hgb', name: 'Hemoglobin (Hb)', unit: 'g/dL', loinc: ['718-7'], normalMin: 12.0, normalMax: 17.5, criticalLow: 7.0, criticalHigh: 20.0 },
  wbc: { code: 'wbc', name: 'White Blood Cells (WBC)', unit: 'x10^3/µL', loinc: ['6690-2'], normalMin: 4.0, normalMax: 11.0, criticalLow: 2.0, criticalHigh: 30.0 },
  plt: { code: 'plt', name: 'Platelet Count', unit: 'x10^3/µL', loinc: ['777-3'], normalMin: 150, normalMax: 450, criticalLow: 20, criticalHigh: 1000 },
  hct: { code: 'hct', name: 'Hematocrit (Hct)', unit: '%', loinc: ['4544-3'], normalMin: 36.0, normalMax: 50.0, criticalLow: 20.0, criticalHigh: 60.0 },
  k: { code: 'k', name: 'Potassium (K+)', unit: 'mmol/L', loinc: ['2823-3'], normalMin: 3.5, normalMax: 5.1, criticalLow: 2.8, criticalHigh: 6.2 },
  na: { code: 'na', name: 'Sodium (Na+)', unit: 'mmol/L', loinc: ['2951-2'], normalMin: 135, normalMax: 145, criticalLow: 120, criticalHigh: 160 },
  glu: { code: 'glu', name: 'Glucose (Fasting/Random)', unit: 'mg/dL', loinc: ['2345-7'], normalMin: 70, normalMax: 105, criticalLow: 45, criticalHigh: 450 },
  cr: { code: 'cr', name: 'Serum Creatinine', unit: 'mg/dL', loinc: ['2160-0'], normalMin: 0.6, normalMax: 1.2, criticalHigh: 5.0 },
  bun: { code: 'bun', name: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL', loinc: ['3094-0'], normalMin: 7, normalMax: 20, criticalHigh: 80 },
  ca: { code: 'ca', name: 'Total Calcium', unit: 'mg/dL', loinc: ['17861-6'], normalMin: 8.5, normalMax: 10.5, criticalLow: 6.5, criticalHigh: 13.0 },
  trop: { code: 'trop', name: 'Troponin I (High-Sensitivity)', unit: 'ng/mL', loinc: ['10839-9'], normalMin: 0.0, normalMax: 0.04, criticalHigh: 0.4 },
  ckmb: { code: 'ckmb', name: 'Creatine Kinase-MB', unit: 'ng/mL', loinc: ['13969-1'], normalMin: 0.0, normalMax: 5.0, criticalHigh: 25.0 },
  bnp: { code: 'bnp', name: 'NT-proBNP', unit: 'pg/mL', loinc: ['33762-6'], normalMin: 0, normalMax: 125, criticalHigh: 900 },
  inr: { code: 'inr', name: 'Prothrombin Time / INR', unit: 'INR', loinc: ['6301-6'], normalMin: 0.8, normalMax: 1.2, criticalHigh: 5.0 },
  aptt: { code: 'aptt', name: 'Activated Partial Thromboplastin (aPTT)', unit: 'seconds', loinc: ['3173-2'], normalMin: 25, normalMax: 35, criticalHigh: 100 },
  alt: { code: 'alt', name: 'ALT (Alanine Aminotransferase)', unit: 'U/L', loinc: ['1742-6'], normalMin: 7, normalMax: 56, criticalHigh: 1000 },
  ast: { code: 'ast', name: 'AST (Aspartate Aminotransferase)', unit: 'U/L', loinc: ['1920-8'], normalMin: 10, normalMax: 40, criticalHigh: 1000 },
  bili: { code: 'bili', name: 'Total Bilirubin', unit: 'mg/dL', loinc: ['1975-2'], normalMin: 0.2, normalMax: 1.2, criticalHigh: 15.0 },
};

/** Codes to look up in lab_critical_ranges for an analyte: its own code plus known LOINC codes. */
export function lookupCodesFor(code: string): string[] {
  const def = DEFAULT_THRESHOLDS[code.toLowerCase()];
  const out = new Set<string>([code]);
  if (def) for (const l of def.loinc) out.add(l);
  return [...out];
}

export function defaultRangeFor(code: string): CriticalRange | null {
  const def = DEFAULT_THRESHOLDS[code.toLowerCase()];
  if (!def) return null;
  return {
    critical_low: def.criticalLow ?? null,
    critical_high: def.criticalHigh ?? null,
    warning_low: def.normalMin,
    warning_high: def.normalMax,
    unit: def.unit,
    source: 'default',
  };
}

export type AgeGroup = 'neonate' | 'infant' | 'pediatric' | 'adolescent' | 'adult' | 'geriatric';

export function ageGroupFromDob(dob: string | null | undefined, now: Date): AgeGroup {
  if (!dob) return 'adult';
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 'adult';
  const days = (now.getTime() - birth.getTime()) / 86_400_000;
  const years = days / 365.25;
  if (days < 28) return 'neonate';
  if (years < 1) return 'infant';
  if (years < 12) return 'pediatric';
  if (years < 18) return 'adolescent';
  if (years >= 65) return 'geriatric';
  return 'adult';
}

/** Synonyms used by lab_critical_ranges.age_group (tier4 used 'neonatal'/'child'). */
const AGE_GROUP_SYNONYMS: Readonly<Record<AgeGroup, readonly string[]>> = {
  neonate: ['neonate', 'neonatal'],
  infant: ['infant'],
  pediatric: ['pediatric', 'child'],
  adolescent: ['adolescent'],
  adult: ['adult'],
  geriatric: ['geriatric'],
};

const AGE_FALLBACK: Readonly<Record<AgeGroup, readonly AgeGroup[]>> = {
  neonate: ['neonate', 'infant', 'pediatric'],
  infant: ['infant', 'pediatric'],
  pediatric: ['pediatric'],
  adolescent: ['adolescent', 'pediatric', 'adult'],
  adult: ['adult'],
  geriatric: ['geriatric', 'adult'],
};

export interface HospitalRangeRow {
  readonly test_code: string;
  readonly age_group: string | null;
  readonly critical_low: number | string | null;
  readonly critical_high: number | string | null;
  readonly warning_low: number | string | null;
  readonly warning_high: number | string | null;
  readonly unit_of_measure: string | null;
}

function toNum(x: number | string | null): number | null {
  if (x === null || x === undefined) return null;
  return parseAnalyteValue(typeof x === 'number' ? x : String(x));
}

/**
 * Picks the hospital range for an age group, falling back along AGE_FALLBACK and
 * finally to a row with no age group. Neonates and infants never fall back to
 * adult limits (they are clinically unsafe for them); they get the default or
 * 'review_required' instead. Returns null when nothing applies.
 */
export function selectHospitalRange(rows: readonly HospitalRangeRow[], ageGroup: AgeGroup): CriticalRange | null {
  for (const group of AGE_FALLBACK[ageGroup]) {
    const names = AGE_GROUP_SYNONYMS[group];
    const row = rows.find((r) => r.age_group !== null && names.includes(r.age_group.toLowerCase()));
    if (row) return rowToRange(row);
  }
  const generic = rows.find((r) => r.age_group === null || r.age_group === '');
  return generic ? rowToRange(generic) : null;
}

function rowToRange(r: HospitalRangeRow): CriticalRange {
  return {
    critical_low: toNum(r.critical_low),
    critical_high: toNum(r.critical_high),
    warning_low: toNum(r.warning_low),
    warning_high: toNum(r.warning_high),
    unit: r.unit_of_measure,
    source: 'hospital',
  };
}

/**
 * Range resolution order: hospital configuration for the patient's age group,
 * then the built-in adult default (only for patients aged 1 year and over),
 * else null, which grades as 'review_required'.
 */
export function resolveRange(
  code: string,
  hospitalRows: readonly HospitalRangeRow[],
  ageGroup: AgeGroup,
): CriticalRange | null {
  const codes = new Set(lookupCodesFor(code).map((c) => c.toLowerCase()));
  const matching = hospitalRows.filter((r) => codes.has(r.test_code.toLowerCase()));
  const hospital = selectHospitalRange(matching, ageGroup);
  if (hospital) return hospital;
  if (ageGroup === 'neonate' || ageGroup === 'infant') return null;
  return defaultRangeFor(code);
}

// ---------------------------------------------------------------------------
// Request validation (hand-written: this file cannot import zod from a URL)
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

export interface CreateAlertRequest {
  readonly action: 'create_alert';
  readonly lab_order_id: string;
  readonly analytes: readonly AnalyteInput[];
  readonly manual_critical: boolean;
  readonly notes?: string;
}

export interface AcknowledgeRequest {
  readonly action: 'acknowledge';
  readonly alert_id?: string;
  readonly lab_order_id?: string;
  readonly notes?: string;
  readonly read_back?: {
    readonly clinician_name?: string;
    readonly clinician_role?: string;
    readonly channel?: string;
    readonly confirmed?: boolean;
  };
}

export interface ProcessEscalationsRequest {
  readonly action: 'process_escalations';
  readonly limit: number;
}

export type CriticalLabRequest = CreateAlertRequest | AcknowledgeRequest | ProcessEscalationsRequest;

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const MAX_ANALYTES = 50;
const str = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim().slice(0, max) : undefined;

export function parseCriticalLabRequest(body: unknown): ParseResult<CriticalLabRequest> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;
  const action = b.action ?? 'create_alert';

  if (action === 'process_escalations') {
    const limit = typeof b.limit === 'number' && Number.isInteger(b.limit) ? Math.min(Math.max(b.limit, 1), 200) : 50;
    return { ok: true, value: { action, limit } };
  }

  if (action === 'acknowledge') {
    const alert_id = b.alert_id ?? b.alertId;
    const lab_order_id = b.lab_order_id;
    if (alert_id !== undefined && !isUuid(alert_id)) return { ok: false, error: 'alert_id must be a UUID' };
    if (lab_order_id !== undefined && !isUuid(lab_order_id)) return { ok: false, error: 'lab_order_id must be a UUID' };
    if (!alert_id && !lab_order_id) return { ok: false, error: 'alert_id or lab_order_id is required' };
    const rb = b.read_back && typeof b.read_back === 'object' ? (b.read_back as Record<string, unknown>) : undefined;
    return {
      ok: true,
      value: {
        action,
        alert_id: alert_id as string | undefined,
        lab_order_id: lab_order_id as string | undefined,
        notes: str(b.notes, 2000),
        read_back: rb
          ? {
              clinician_name: str(rb.clinician_name, 200),
              clinician_role: str(rb.clinician_role, 100),
              channel: str(rb.channel, 100),
              confirmed: rb.confirmed === true,
            }
          : undefined,
      },
    };
  }

  if (action !== 'create_alert') return { ok: false, error: `Unknown action: ${String(action)}` };

  if (!isUuid(b.lab_order_id)) {
    return { ok: false, error: 'lab_order_id must be the UUID of the lab order' };
  }
  if (b.analytes !== undefined && !Array.isArray(b.analytes)) {
    return { ok: false, error: 'analytes must be an array' };
  }
  const rawAnalytes = (b.analytes as unknown[] | undefined) ?? [];
  if (rawAnalytes.length > MAX_ANALYTES) return { ok: false, error: `At most ${MAX_ANALYTES} analytes per request` };

  const analytes: AnalyteInput[] = [];
  for (const [i, a] of rawAnalytes.entries()) {
    if (!a || typeof a !== 'object') return { ok: false, error: `analytes[${i}] must be an object` };
    const r = a as Record<string, unknown>;
    const code = str(r.code, 64);
    if (!code) return { ok: false, error: `analytes[${i}].code is required` };
    const v = r.value;
    if (!(typeof v === 'number' || typeof v === 'string' || v === null)) {
      return { ok: false, error: `analytes[${i}].value must be a number, string or null` };
    }
    analytes.push({
      code,
      name: str(r.name, 200),
      value: typeof v === 'string' ? v.slice(0, 200) : v,
      unit: str(r.unit, 32),
    });
  }

  const manual_critical = b.manual_critical === true;
  if (analytes.length === 0 && !manual_critical) {
    return { ok: false, error: 'Provide at least one analyte, or set manual_critical for a non-numeric result' };
  }
  return { ok: true, value: { action, lab_order_id: b.lab_order_id as string, analytes, manual_critical, notes: str(b.notes, 2000) } };
}

// ---------------------------------------------------------------------------
// Ladder and worker policy
// ---------------------------------------------------------------------------

export interface LadderRow {
  readonly escalation_level: EscalationLevel;
  readonly scheduled_for: string;
}

/** One row per level; the unique (alert_id, escalation_level) index makes re-insertion a no-op. */
export function buildLadderSchedule(createdAt: Date): LadderRow[] {
  return ESCALATION_LEVELS.map((level) => ({
    escalation_level: level,
    scheduled_for: new Date(createdAt.getTime() + ESCALATION_DELAY_MINUTES[level] * 60_000).toISOString(),
  }));
}

export type ChannelStatus = 'delivered' | 'failed' | 'not_configured' | 'no_contact';

export interface ChannelResult {
  readonly channel: 'in_app' | 'pager';
  readonly recipient_profile_id: string;
  readonly status: ChannelStatus;
  readonly detail?: string;
}

export interface DispatchOutcome {
  readonly status: Extract<EscalationStatus, 'dispatched' | 'pending' | 'failed'>;
  readonly error_message: string | null;
  /** Set when status is 'pending' again (a retry). */
  readonly retry_at: string | null;
  readonly delivered_count: number;
}

/**
 * 'dispatched' only when at least one channel actually delivered to at least
 * one recipient. A pager hook that is not configured does not count as
 * delivery. Otherwise retry up to MAX_DISPATCH_ATTEMPTS, then 'failed'.
 */
export function decideDispatchOutcome(results: readonly ChannelResult[], attempt: number, now: Date): DispatchOutcome {
  const delivered = results.filter((r) => r.status === 'delivered').length;
  const problems = results
    .filter((r) => r.status === 'failed' || r.status === 'no_contact')
    .map((r) => `${r.channel}:${r.status}${r.detail ? `(${r.detail})` : ''}`);
  if (results.length === 0) problems.push('no_recipients_resolved');

  if (delivered > 0) {
    return {
      status: 'dispatched',
      error_message: problems.length ? `partial: ${problems.join('; ')}`.slice(0, 1000) : null,
      retry_at: null,
      delivered_count: delivered,
    };
  }
  const message = (problems.length ? problems.join('; ') : 'no channel delivered').slice(0, 1000);
  if (attempt < MAX_DISPATCH_ATTEMPTS) {
    return {
      status: 'pending',
      error_message: `attempt ${attempt} failed: ${message}`,
      retry_at: new Date(now.getTime() + RETRY_DELAY_MINUTES * 60_000).toISOString(),
      delivered_count: 0,
    };
  }
  return { status: 'failed', error_message: `gave up after ${attempt} attempts: ${message}`, retry_at: null, delivered_count: 0 };
}

/** Column on lab_critical_alerts stamped when a level is dispatched. */
export const NOTIFIED_AT_COLUMN: Readonly<Record<EscalationLevel, string>> = {
  primary: 'primary_notified_at',
  on_call: 'on_call_notified_at',
  er: 'er_notified_at',
};

/** Message without PHI for SMS/pager: no patient name, value or test. */
export function pagerMessage(level: EscalationLevel, alertId: string): string {
  const who = level === 'primary' ? 'ordering clinician' : level === 'on_call' ? 'on-call clinician (escalated)' : 'emergency department (escalated)';
  return `CareSync: unacknowledged CRITICAL lab result needs the ${who}. Ref ${alertId.slice(0, 8)}. Open CareSync to review and acknowledge.`;
}

export function inAppMessage(args: {
  level: EscalationLevel;
  testName: string;
  severity: AlertSeverity;
  value: string | null;
  unit: string | null;
}): { title: string; message: string } {
  const prefix = args.level === 'primary' ? 'Critical lab result' : `ESCALATED (${args.level === 'on_call' ? 'on-call, 5 min' : 'ED, 10 min'}): critical lab result`;
  const sev = args.severity === 'review_required' ? 'needs urgent clinician review (could not be auto-graded)' : args.severity.replace('_', ' ');
  const val = args.value ? ` = ${args.value}${args.unit ? ` ${args.unit}` : ''}` : '';
  return {
    title: `${prefix}: ${args.testName}`.slice(0, 200),
    message: `${args.testName}${val} — ${sev}. Acknowledge in CareSync to stop escalation.`.slice(0, 1000),
  };
}

// ---------------------------------------------------------------------------
// Worker authentication
// ---------------------------------------------------------------------------

/** Constant-time string comparison (length is not secret). */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    // charCodeAt past the end is NaN; `|| 0` keeps the loop branch-free.
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export const WORKER_SECRET_HEADER = 'x-critical-lab-worker-secret';
const MIN_SECRET_LENGTH = 32;

/**
 * The worker path accepts ONLY service credentials, never a user JWT:
 *   - header x-critical-lab-worker-secret equal to CRITICAL_LAB_WORKER_SECRET
 *     (at least 32 chars; an unset or short secret disables this route), or
 *   - Authorization: Bearer <the project's service-role key>, compared exactly.
 */
export function isWorkerAuthorized(
  getHeader: (name: string) => string | null,
  env: { workerSecret?: string | null; serviceRoleKey?: string | null },
): boolean {
  const secret = env.workerSecret ?? '';
  const presented = getHeader(WORKER_SECRET_HEADER);
  if (secret.length >= MIN_SECRET_LENGTH && presented && constantTimeEqual(presented, secret)) return true;

  const key = env.serviceRoleKey ?? '';
  const auth = getHeader('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  return key.length >= MIN_SECRET_LENGTH && !!m && constantTimeEqual(m[1].trim(), key);
}
