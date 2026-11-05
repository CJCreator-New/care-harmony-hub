/**
 * Mapping from the application's free-text prescription and patient records to
 * the engine's structured inputs.
 *
 * Rule for every parser here: if a value cannot be interpreted reliably it is
 * reported as unknown (undefined / 'UNSPECIFIED' / NaN), never guessed. The
 * engine then either skips the rule that needs it or raises a fail-closed
 * finding (see pediatricEngine and contextIntegrity).
 */

import { AdministrationRoute, OrderItemIntent, SafetyFinding } from '../types';

// ─── Doses ────────────────────────────────────────────────────────────────────

const MASS_UNITS_TO_MG: Record<string, number> = {
  mg: 1,
  milligram: 1,
  milligrams: 1,
  g: 1000,
  gm: 1000,
  gram: 1000,
  grams: 1000,
  mcg: 0.001,
  'µg': 0.001,
  ug: 0.001,
  microgram: 0.001,
  micrograms: 0.001,
};

/**
 * Parses a single dose mass from text such as "500mg", "0.5 g", "1,000 mg",
 * "250 mcg PO". Returns NaN for volumes (mL needs a concentration), ranges
 * ("1-2 tablets"), counts ("2 tabs") or multiple different masses.
 */
export function parseDoseMg(dosage: string | null | undefined): number {
  if (!dosage) return Number.NaN;
  const text = dosage.toLowerCase().replace(/(\d),(\d{3})/g, '$1$2');
  const matches = [
    ...text.matchAll(/(\d+(?:\.\d+)?)\s*(mg|milligrams?|g|gm|grams?|mcg|µg|ug|micrograms?)\b/g),
  ];
  if (matches.length === 0) return Number.NaN;
  const values = new Set(matches.map((m) => Number(m[1]) * MASS_UNITS_TO_MG[m[2]]));
  if (values.size !== 1) return Number.NaN; // ambiguous, e.g. "250 mg or 500 mg"
  // A range like "250-500 mg" is ambiguous too.
  if (/\d\s*(?:-|to)\s*\d+(?:\.\d+)?\s*(mg|g|mcg)/.test(text)) return Number.NaN;
  const [value] = values;
  return Number.isFinite(value) && value > 0 ? value : Number.NaN;
}

// ─── Route ────────────────────────────────────────────────────────────────────

const ROUTE_PATTERNS: Array<[RegExp, AdministrationRoute]> = [
  [/\biv\s*(?:slow|infusion|piggyback)\b|\bslow\s*iv\b/, 'IV (slow)'],
  [/\b(?:iv|intravenous(?:ly)?)\b/, 'IV'],
  [/\b(?:im|intramuscular(?:ly)?)\b/, 'IM'],
  [/\b(?:sc|sq|subcut|s\/c|subcutaneous(?:ly)?)\b/, 'SC'],
  [/\b(?:sl|sublingual(?:ly)?)\b/, 'SL'],
  [/\b(?:pr|rectal(?:ly)?|suppository)\b/, 'PR'],
  [/\b(?:inhal(?:ed|ation|er)?|nebuli[sz]ed?|neb|puffs?)\b/, 'Inhaled'],
  [/\b(?:topical(?:ly)?|cream|ointment|gel|patch)\b/, 'Topical'],
  [/\b(?:po|oral(?:ly)?|by mouth|tablet|tab|capsule|cap|syrup)s?\b/, 'PO'],
];

/** Infers the route from any free text that states it; otherwise 'UNSPECIFIED'. */
export function inferRoute(...texts: Array<string | null | undefined>): AdministrationRoute {
  const text = texts.filter(Boolean).join(' ').toLowerCase();
  if (!text) return 'UNSPECIFIED';
  const found = new Set(ROUTE_PATTERNS.filter(([re]) => re.test(text)).map(([, r]) => r));
  // "IV (slow)" also matches the plain IV pattern; prefer the specific one.
  if (found.has('IV (slow)')) found.delete('IV');
  return found.size === 1 ? [...found][0] : 'UNSPECIFIED';
}

// ─── Frequency ────────────────────────────────────────────────────────────────

/**
 * Doses per day from common sig notations. Interval ranges use the shorter
 * interval (more doses), which is the conservative assumption for overdose
 * screening. PRN / weekly / unknown return undefined.
 */
export function parseDosesPerDay(frequency: string | null | undefined): number | undefined {
  if (!frequency) return undefined;
  const f = frequency.toLowerCase().trim();
  if (/\bprn\b|as needed|when required|sos\b/.test(f) && !/\bq\d/.test(f)) return undefined;
  const interval = f.replace(/\s+/g, '').match(/(?:^|[^a-z])q(\d+)(?:-(\d+))?h|every(\d+)(?:-(\d+))?(?:hours?|hrs?|h)\b/);
  if (interval) {
    const hours = Number(interval[1] ?? interval[3]);
    if (hours > 0) return Math.max(1, Math.floor(24 / hours));
  }
  if (/\bqid\b|four times|4 ?x|4 times/.test(f)) return 4;
  if (/\btid\b|three times|thrice|3 ?x|3 times/.test(f)) return 3;
  if (/\bbid\b|\bbd\b|twice|2 ?x|2 times/.test(f)) return 2;
  if (/\b(?:qd|od|daily|once|qhs|hs|at bedtime|nightly|every morning|qam)\b|1 ?x/.test(f)) return 1;
  return undefined;
}

// ─── Order rows → order items ─────────────────────────────────────────────────

/** Shape used by the consultation, quick-consultation and pharmacy screens. */
export interface PrescriptionRowLike {
  readonly id?: string | null;
  readonly medication_name?: string | null;
  readonly medication?: string | null;
  readonly dosage?: string | null;
  readonly frequency?: string | null;
  readonly instructions?: string | null;
  readonly route?: string | null;
}

/**
 * Converts prescription rows into engine order items. Rows without a medication
 * name are dropped. `clientItemId` uses the row id when present, otherwise
 * `${prefix}-${index}` so findings and overrides stay attached to the row.
 */
export function toOrderItems(
  rows: readonly PrescriptionRowLike[] | null | undefined,
  prefix = 'rx'
): OrderItemIntent[] {
  return (rows || []).flatMap((row, index) => {
    const drugName = String(row.medication_name ?? row.medication ?? '').trim();
    if (!drugName) return [];
    const dosesPerDay = parseDosesPerDay(row.frequency);
    const fromDosage = parseDoseMg(row.dosage);
    return [
      {
        clientItemId: row.id ? String(row.id) : `${prefix}-${index}`,
        drugName,
        // "1 tab" in the dosage field but "Amoxicillin 500mg" as the name: use the name.
        doseMg: Number.isFinite(fromDosage) ? fromDosage : parseDoseMg(drugName),
        route: inferRoute(row.route, row.dosage, row.instructions),
        frequency: String(row.frequency ?? '').trim() || 'unspecified',
        ...(dosesPerDay !== undefined ? { dosesPerDay } : {}),
      },
    ];
  });
}

// ─── Patient record fields ────────────────────────────────────────────────────

const NO_KNOWN_ALLERGY = /^(none|nil|no|n\/a|na|nka|nkda|nkma|no known (drug )?allergies?|no allergies?|not known|denies)\.?$/i;

/**
 * Normalizes a stored allergy field (string[] | comma/semicolon/newline string)
 * to a list of allergy terms. Returns `{ allergies, recorded }`; "NKDA" style
 * entries count as recorded-but-empty. `recorded: false` means nothing at all
 * is on file (unknown status).
 */
export function normalizeAllergyList(raw: unknown): { allergies: string[]; recorded: boolean } {
  const parts: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === 'string') parts.push(...v.split(/[,;\n]+/));
    else if (v && typeof v === 'object' && 'name' in (v as Record<string, unknown>)) {
      push((v as Record<string, unknown>).name);
    }
  };
  if (Array.isArray(raw)) raw.forEach(push);
  else push(raw);
  const trimmed = parts.map((p) => p.trim()).filter(Boolean);
  if (trimmed.length === 0) return { allergies: [], recorded: false };
  const allergies = [...new Map(trimmed.filter((p) => !NO_KNOWN_ALLERGY.test(p)).map((p) => [p.toLowerCase(), p])).values()];
  return { allergies, recorded: true };
}

/**
 * Normalizes `patients.current_medications` (string[] | {name,dosage}[] | text)
 * to engine medications.
 */
export function medicationsFromRecord(
  raw: unknown
): Array<{ drugName: string; dosageMg?: number }> {
  const out: Array<{ drugName: string; dosageMg?: number }> = [];
  const push = (v: unknown) => {
    if (typeof v === 'string') {
      for (const part of v.split(/[,;\n]+/)) {
        const name = part.trim();
        if (name && !NO_KNOWN_ALLERGY.test(name) && !/^none reported$/i.test(name)) {
          const mg = parseDoseMg(name);
          out.push({ drugName: name, ...(Number.isFinite(mg) ? { dosageMg: mg } : {}) });
        }
      }
    } else if (v && typeof v === 'object') {
      const rec = v as Record<string, unknown>;
      const name = String(rec.name ?? rec.medication_name ?? rec.drug_name ?? rec.medication ?? '').trim();
      if (name) {
        const mg = parseDoseMg(String(rec.dosage ?? rec.dose ?? name));
        out.push({ drugName: name, ...(Number.isFinite(mg) ? { dosageMg: mg } : {}) });
      }
    }
  };
  if (Array.isArray(raw)) raw.forEach(push);
  else push(raw);
  return [...new Map(out.map((m) => [m.drugName.toLowerCase(), m])).values()];
}

/** Age in whole years and months at `now` from an ISO date of birth. */
export function ageFromDateOfBirth(
  dob: string | null | undefined,
  now: Date = new Date()
): { ageYears: number; ageMonths: number } | null {
  if (!dob) return null;
  const m = String(dob).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - mo);
  if (now.getDate() < d) months -= 1;
  if (months < 0 || months > 150 * 12) return null;
  return { ageYears: Math.floor(months / 12), ageMonths: months };
}

/** Maps the database gender enum / free text to the engine's 'M' | 'F' | 'O'. */
export function mapGender(g: string | null | undefined): 'M' | 'F' | 'O' | undefined {
  const v = (g || '').toLowerCase();
  if (v === 'male' || v === 'm') return 'M';
  if (v === 'female' || v === 'f') return 'F';
  if (v) return 'O';
  return undefined;
}

// ─── Finding identity across screens ──────────────────────────────────────────

/**
 * A finding code embeds the client item id, which differs between the
 * prescriber screen (row index) and the pharmacist screen (database id). This
 * key identifies the same clinical issue on both screens so a prescriber's
 * documented override can be shown to, and honoured by, the pharmacist.
 */
export function findingKey(f: Pick<SafetyFinding, 'kind' | 'drugName' | 'interactingSubject' | 'code'>): string {
  const norm = (s?: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  // Item-independent findings keep their stable code.
  if (f.kind === 'UPSTREAM_CDS_DEGRADATION') return `${f.kind}|${f.code}`;
  return `${f.kind}|${norm(f.drugName)}|${norm(f.interactingSubject)}`;
}
