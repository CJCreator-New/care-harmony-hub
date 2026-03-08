import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIdentifier, rateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ALLOWED_ORIGINS")?.split(",")[0]?.trim() || "http://localhost:5173",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FHIR_CONTENT_TYPE = "application/fhir+json";
const OBS_STATUS_VALUES = new Set([
  "registered",
  "preliminary",
  "final",
  "amended",
  "corrected",
  "cancelled",
  "entered-in-error",
  "unknown",
]);
const FHIR_GENDER_VALUES = new Set(["male", "female", "other", "unknown"]);
const OBS_VITAL_FIELD_BY_CODE: Record<string, string> = {
  "8867-4": "heart_rate",
  "8480-6": "blood_pressure_systolic",
  "8462-4": "blood_pressure_diastolic",
  "8310-5": "temperature",
  "2708-6": "oxygen_saturation",
};
const ENCOUNTER_STATUS_BY_CONSULTATION_STATUS: Record<string, string> = {
  pending: "planned",
  patient_overview: "in-progress",
  clinical_assessment: "in-progress",
  treatment_planning: "in-progress",
  final_review: "in-progress",
  handoff: "in-progress",
  completed: "finished",
};
type FhirAction =
  | "export_patient"
  | "import_patient"
  | "sync_observations"
  | "export_encounter";

type ScopeAccessType = "read" | "write";

interface ActionScopeRequirement {
  resource: "Patient" | "Observation" | "Encounter";
  access: ScopeAccessType;
  allowPatientContext: boolean;
  fallbackRoles: string[];
}

const ACTION_SCOPE_REQUIREMENTS: Record<FhirAction, ActionScopeRequirement> = {
  export_patient: {
    resource: "Patient",
    access: "read",
    allowPatientContext: true,
    fallbackRoles: ["admin", "doctor"],
  },
  import_patient: {
    resource: "Patient",
    access: "write",
    allowPatientContext: false,
    fallbackRoles: ["admin", "doctor"],
  },
  sync_observations: {
    resource: "Observation",
    access: "write",
    allowPatientContext: true,
    fallbackRoles: ["admin", "doctor", "nurse"],
  },
  export_encounter: {
    resource: "Encounter",
    access: "read",
    allowPatientContext: true,
    fallbackRoles: ["admin", "doctor"],
  },
};

interface RequestAuthContext {
  userId: string;
  hospitalId: string | null;
  roles: Set<string>;
  scopes: Set<string>;
  patientRecordId: string | null;
}

interface ActionAuthorization {
  action: FhirAction;
  requestAuth: RequestAuthContext;
  patientScoped: boolean;
  systemScoped: boolean;
  grantSource: "smart-scope" | "role-fallback";
}

interface FHIRPatient {
  resourceType: "Patient";
  id?: string;
  meta?: { versionId?: string; lastUpdated?: string };
  identifier?: Array<{ system?: string; value?: string }>;
  name?: Array<{ family?: string; given?: string[] }>;
  telecom?: Array<{ system?: string; value?: string }>;
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: string;
  address?: Array<{ line?: string[]; city?: string; state?: string; postalCode?: string }>;
}

interface HttpErrorOptions {
  status: number;
  code: string;
  diagnostics: string;
  headers?: HeadersInit;
}

class HttpError extends Error {
  status: number;
  code: string;
  diagnostics: string;
  headers?: HeadersInit;

  constructor({ status, code, diagnostics, headers }: HttpErrorOptions) {
    super(diagnostics);
    this.status = status;
    this.code = code;
    this.diagnostics = diagnostics;
    this.headers = headers;
  }
}

function operationOutcome(code: string, diagnostics: string, severity = "error") {
  return {
    resourceType: "OperationOutcome",
    issue: [{ severity, code, diagnostics }],
  };
}

function fhirResponse(content: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(content, null, 2), {
    status,
    headers: {
      "Content-Type": FHIR_CONTENT_TYPE,
      ...corsHeaders,
      ...headers,
    },
  });
}

function fhirError(
  status: number,
  code: string,
  diagnostics: string,
  headers: HeadersInit = {},
): Response {
  return fhirResponse(operationOutcome(code, diagnostics), status, headers);
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeWeakEtagValue(value: string): string {
  return value.replace(/["\\]/g, "");
}

function mapGenderToFhir(gender: string | null | undefined): FHIRPatient["gender"] {
  if (gender === "male" || gender === "female" || gender === "other") return gender;
  return "unknown";
}

function mapGenderFromFhir(gender: FHIRPatient["gender"]): string {
  if (gender === "male" || gender === "female" || gender === "other") return gender;
  return "prefer_not_to_say";
}

function getTelecomValue(patient: FHIRPatient, system: string): string | undefined {
  const entry = patient.telecom?.find((item) => item?.system === system && asString(item?.value));
  return entry ? asString(entry.value) : undefined;
}

function getPatientName(patient: FHIRPatient): { firstName: string; lastName: string } {
  const firstNameEntry = patient.name?.[0];
  const given = Array.isArray(firstNameEntry?.given)
    ? firstNameEntry.given.map((name) => name.trim()).filter(Boolean)
    : [];
  const family = asString(firstNameEntry?.family);

  const firstName = given[0] ?? family ?? "Unknown";
  const derivedLastName = family ?? given.slice(1).join(" ");
  const lastName = derivedLastName || "Unknown";
  return { firstName, lastName };
}

function getPatientAddress(patient: FHIRPatient) {
  const firstAddress = patient.address?.[0];
  const line = Array.isArray(firstAddress?.line)
    ? firstAddress.line.map((value) => value.trim()).filter(Boolean).join(", ")
    : undefined;
  return {
    address: line,
    city: asString(firstAddress?.city),
    state: asString(firstAddress?.state),
    zip: asString(firstAddress?.postalCode),
  };
}

function getPatientMrn(patient: FHIRPatient): string | undefined {
  const identifier = patient.identifier?.find((entry) => asString(entry?.value));
  return identifier ? asString(identifier.value) : undefined;
}

function mapPatientToFhir(patient: any): FHIRPatient {
  const lastUpdated = patient.updated_at ?? patient.created_at ?? new Date().toISOString();
  const fhirPatient: FHIRPatient = {
    resourceType: "Patient",
    id: patient.id,
    meta: {
      versionId: lastUpdated,
      lastUpdated,
    },
    identifier: [
      {
        system: "http://hospital.caresync.com/mrn",
        value: patient.mrn,
      },
    ],
    name: [
      {
        family: patient.last_name,
        given: [patient.first_name].filter(Boolean),
      },
    ],
    gender: mapGenderToFhir(patient.gender),
    birthDate: patient.date_of_birth,
  };

  const telecom: Array<{ system: string; value: string }> = [];
  if (asString(patient.phone)) telecom.push({ system: "phone", value: patient.phone });
  if (asString(patient.email)) telecom.push({ system: "email", value: patient.email });
  if (telecom.length > 0) fhirPatient.telecom = telecom;

  if (
    asString(patient.address) ||
    asString(patient.city) ||
    asString(patient.state) ||
    asString(patient.zip)
  ) {
    fhirPatient.address = [
      {
        line: asString(patient.address) ? [patient.address] : undefined,
        city: patient.city ?? undefined,
        state: patient.state ?? undefined,
        postalCode: patient.zip ?? undefined,
      },
    ];
  }

  return fhirPatient;
}

function getObservationNumericValue(observation: any): number | undefined {
  const raw = observation?.valueQuantity?.value;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim().length > 0 && Number.isFinite(Number(raw))) {
    return Number(raw);
  }
  return undefined;
}

function mapObservationToVitalSign(patientId: string, observation: any, index: number) {
  if (observation?.resourceType && observation.resourceType !== "Observation") {
    throw new HttpError({
      status: 400,
      code: "invalid",
      diagnostics: `Observation[${index}] has invalid resourceType '${observation.resourceType}'.`,
    });
  }

  const status = asString(observation?.status);
  if (!status) {
    throw new HttpError({
      status: 422,
      code: "required",
      diagnostics: `Observation[${index}].status is required.`,
    });
  }
  if (!OBS_STATUS_VALUES.has(status)) {
    throw new HttpError({
      status: 422,
      code: "value",
      diagnostics: `Observation[${index}] has invalid status '${status}'.`,
    });
  }

  const primaryCode = asString(observation?.code?.coding?.[0]?.code);
  if (!primaryCode) {
    throw new HttpError({
      status: 422,
      code: "required",
      diagnostics: `Observation[${index}].code.coding[0].code is required.`,
    });
  }

  const recordedAt = asString(observation?.effectiveDateTime) ?? new Date().toISOString();
  const mapped: Record<string, unknown> = { patient_id: patientId, recorded_at: recordedAt };

  if (primaryCode === "85354-9") {
    const systolic = observation?.component?.find(
      (component: any) => asString(component?.code?.coding?.[0]?.code) === "8480-6",
    );
    const diastolic = observation?.component?.find(
      (component: any) => asString(component?.code?.coding?.[0]?.code) === "8462-4",
    );

    const systolicValue = getObservationNumericValue(systolic);
    const diastolicValue = getObservationNumericValue(diastolic);

    if (typeof systolicValue !== "number" || typeof diastolicValue !== "number") {
      throw new HttpError({
        status: 422,
        code: "value",
        diagnostics: `Observation[${index}] blood pressure components are incomplete.`,
      });
    }

    mapped.blood_pressure_systolic = systolicValue;
    mapped.blood_pressure_diastolic = diastolicValue;
    return mapped;
  }

  const targetField = OBS_VITAL_FIELD_BY_CODE[primaryCode];
  if (!targetField) {
    throw new HttpError({
      status: 422,
      code: "value",
      diagnostics: `Observation[${index}] code '${primaryCode}' is not supported.`,
    });
  }

  const numericValue = getObservationNumericValue(observation);
  if (typeof numericValue !== "number") {
    throw new HttpError({
      status: 422,
      code: "value",
      diagnostics: `Observation[${index}] requires numeric valueQuantity.value.`,
    });
  }

  mapped[targetField] = numericValue;
  return mapped;
}

async function generateMrn(supabase: any, hospitalId: string): Promise<string> {
  const { data, error } = await supabase.rpc("generate_mrn", { hospital_id: hospitalId });
  if (error || !data) {
    throw new HttpError({
      status: 500,
      code: "exception",
      diagnostics: `Failed to generate MRN for hospital '${hospitalId}'.`,
    });
  }
  return String(data);
}

function isFhirAction(action: string): action is FhirAction {
  return action in ACTION_SCOPE_REQUIREMENTS;
}

function buildScopeHint(requirement: ActionScopeRequirement): string {
  return `user/${requirement.resource}.${requirement.access}`;
}

function extractBearerToken(req: Request): string {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new HttpError({
      status: 401,
      code: "login",
      diagnostics: "Missing Authorization header.",
      headers: {
        "WWW-Authenticate": 'Bearer realm="fhir", error="invalid_request", error_description="Missing Authorization header"',
      },
    });
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1].trim()) {
    throw new HttpError({
      status: 401,
      code: "login",
      diagnostics: "Malformed bearer token.",
      headers: {
        "WWW-Authenticate": 'Bearer realm="fhir", error="invalid_request", error_description="Malformed bearer token"',
      },
    });
  }

  return match[1].trim();
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const tokenParts = token.split(".");
  if (tokenParts.length < 2) {
    throw new HttpError({
      status: 401,
      code: "login",
      diagnostics: "Malformed JWT.",
      headers: {
        "WWW-Authenticate": 'Bearer realm="fhir", error="invalid_token", error_description="Malformed JWT"',
      },
    });
  }

  const payloadSegment = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padding = payloadSegment.length % 4 === 0 ? "" : "=".repeat(4 - (payloadSegment.length % 4));
  const decoded = atob(payloadSegment + padding);
  const parsed = JSON.parse(decoded);

  if (!parsed || typeof parsed !== "object") {
    throw new HttpError({
      status: 401,
      code: "login",
      diagnostics: "JWT payload is invalid.",
      headers: {
        "WWW-Authenticate": 'Bearer realm="fhir", error="invalid_token", error_description="Invalid JWT payload"',
      },
    });
  }

  return parsed as Record<string, unknown>;
}

function parseScopeField(value: unknown): string[] {
  if (typeof value === "string") {
    return value.split(/\s+/).map((scope) => scope.trim()).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .flatMap((entry) => entry.split(/\s+/))
      .map((scope) => scope.trim())
      .filter(Boolean);
  }
  return [];
}

function extractSmartScopes(token: string, user: any): Set<string> {
  const jwtPayload = decodeJwtPayload(token);
  const candidates: unknown[] = [
    jwtPayload.scope,
    jwtPayload.scp,
    jwtPayload.smart_scope,
    jwtPayload.smart_scopes,
    user?.app_metadata?.scope,
    user?.app_metadata?.scopes,
    user?.app_metadata?.smart_scope,
    user?.app_metadata?.smart_scopes,
    user?.user_metadata?.scope,
    user?.user_metadata?.scopes,
    user?.user_metadata?.smart_scope,
    user?.user_metadata?.smart_scopes,
  ];

  const scopes = new Set<string>();
  for (const candidate of candidates) {
    for (const scope of parseScopeField(candidate)) {
      scopes.add(scope);
    }
  }

  return scopes;
}

function parseSmartScope(scope: string): { context: "patient" | "user" | "system"; resource: string; permissions: string } | null {
  const match = scope.match(/(?:^|\/)(patient|user|system)\/([^.\s/]+|\*)\.([A-Za-z*]+)/i);
  if (!match) return null;

  return {
    context: match[1].toLowerCase() as "patient" | "user" | "system",
    resource: match[2],
    permissions: match[3],
  };
}

function permissionGrantsAccess(permissions: string, requiredAccess: ScopeAccessType): boolean {
  const normalized = permissions.toLowerCase();

  if (normalized.includes("*")) return true;
  if (normalized.includes("read")) return requiredAccess === "read";
  if (normalized.includes("write")) return requiredAccess === "write";

  const permissionChars = new Set(normalized.split(""));
  if (requiredAccess === "read") {
    return permissionChars.has("r") || permissionChars.has("s");
  }
  return (
    permissionChars.has("w") ||
    permissionChars.has("c") ||
    permissionChars.has("u") ||
    permissionChars.has("d")
  );
}

function evaluateSmartScopeGrant(scopes: Set<string>, requirement: ActionScopeRequirement) {
  let grantedByPatientScope = false;
  let grantedByNonPatientScope = false;
  let grantedBySystemScope = false;

  for (const scope of scopes) {
    const parsed = parseSmartScope(scope);
    if (!parsed) continue;

    const resourceMatches =
      parsed.resource === "*" || parsed.resource.toLowerCase() === requirement.resource.toLowerCase();
    if (!resourceMatches) continue;
    if (!permissionGrantsAccess(parsed.permissions, requirement.access)) continue;

    if (parsed.context === "patient" && requirement.allowPatientContext) {
      grantedByPatientScope = true;
      continue;
    }
    if (parsed.context === "system") {
      grantedBySystemScope = true;
      grantedByNonPatientScope = true;
      continue;
    }
    if (parsed.context === "user") {
      grantedByNonPatientScope = true;
    }
  }

  if (grantedByNonPatientScope) {
    return { granted: true, patientScoped: false, systemScoped: grantedBySystemScope };
  }
  if (grantedByPatientScope) {
    return { granted: true, patientScoped: true, systemScoped: false };
  }
  return { granted: false, patientScoped: false, systemScoped: false };
}

async function authorizeFhirAction(
  req: Request,
  supabase: any,
  action: FhirAction,
): Promise<ActionAuthorization> {
  const requirement = ACTION_SCOPE_REQUIREMENTS[action];
  const token = extractBearerToken(req);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw new HttpError({
      status: 401,
      code: "login",
      diagnostics: "Unauthorized: token missing, expired, revoked, or invalid.",
      headers: {
        "WWW-Authenticate": 'Bearer realm="fhir", error="invalid_token", error_description="Token verification failed"',
      },
    });
  }

  const { data: profileByUserId, error: profileByUserIdError } = await supabase
    .from("profiles")
    .select("hospital_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileByUserIdError) {
    throw new HttpError({
      status: 500,
      code: "exception",
      diagnostics: `Failed to resolve caller profile: ${profileByUserIdError.message}`,
    });
  }

  const profileHospitalId = profileByUserId?.hospital_id ?? null;
  if (!profileHospitalId) {
    throw new HttpError({
      status: 403,
      code: "forbidden",
      diagnostics: "Caller profile not found or has no associated hospital.",
    });
  }

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role, hospital_id")
    .eq("user_id", user.id);
  if (roleError) {
    throw new HttpError({
      status: 500,
      code: "exception",
      diagnostics: `Failed to resolve caller roles: ${roleError.message}`,
    });
  }

  const { data: patientRows, error: patientLookupError } = await supabase
    .from("patients")
    .select("id, hospital_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);
  if (patientLookupError) {
    throw new HttpError({
      status: 500,
      code: "exception",
      diagnostics: `Failed to resolve caller patient context: ${patientLookupError.message}`,
    });
  }

  const patientRecord = Array.isArray(patientRows) && patientRows.length > 0 ? patientRows[0] : null;
  const roleHospitalId = roleRows?.find((row: any) => row.hospital_id)?.hospital_id ?? null;
  const hospitalId = profileHospitalId ?? roleHospitalId ?? patientRecord?.hospital_id ?? null;

  const effectiveRoles = new Set<string>(
    (roleRows ?? [])
      .filter((row: any) => !hospitalId || row.hospital_id === null || row.hospital_id === hospitalId)
      .map((row: any) => String(row.role)),
  );

  const metadataRole = asString((user as any)?.app_metadata?.role) ?? asString((user as any)?.role);
  if (metadataRole) effectiveRoles.add(metadataRole);

  const scopes = extractSmartScopes(token, user);
  const smartScopeGrant = evaluateSmartScopeGrant(scopes, requirement);

  const requestAuth: RequestAuthContext = {
    userId: user.id,
    hospitalId,
    roles: effectiveRoles,
    scopes,
    patientRecordId: patientRecord?.id ?? null,
  };

  if (smartScopeGrant.granted) {
    return {
      action,
      requestAuth,
      patientScoped: smartScopeGrant.patientScoped,
      systemScoped: smartScopeGrant.systemScoped,
      grantSource: "smart-scope",
    };
  }

  const roleGranted = requirement.fallbackRoles.some((role) => effectiveRoles.has(role));
  if (roleGranted) {
    return {
      action,
      requestAuth,
      patientScoped: false,
      systemScoped: false,
      grantSource: "role-fallback",
    };
  }

  throw new HttpError({
    status: 403,
    code: "forbidden",
    diagnostics: `Insufficient SMART scope for '${action}'. Required scope similar to '${buildScopeHint(requirement)}'.`,
    headers: {
      "WWW-Authenticate": `Bearer realm="fhir", error="insufficient_scope", scope="${buildScopeHint(requirement)}"`,
    },
  });
}

function enforceHospitalAccess(
  authorization: ActionAuthorization,
  resourceHospitalId: string | null | undefined,
  resourceLabel: string,
) {
  if (authorization.systemScoped) return;

  const callerHospitalId = authorization.requestAuth.hospitalId;
  if (!callerHospitalId) {
    throw new HttpError({
      status: 403,
      code: "forbidden",
      diagnostics: "Caller is not associated with a hospital context.",
    });
  }

  if (!resourceHospitalId || resourceHospitalId !== callerHospitalId) {
    throw new HttpError({
      status: 403,
      code: "forbidden",
      diagnostics: `Access to ${resourceLabel} is forbidden for this hospital context.`,
    });
  }
}

function enforcePatientScopeAccess(
  authorization: ActionAuthorization,
  targetPatientId: string,
  resourceLabel: string,
) {
  if (!authorization.patientScoped) return;

  const callerPatientId = authorization.requestAuth.patientRecordId;
  if (!callerPatientId || callerPatientId !== targetPatientId) {
    throw new HttpError({
      status: 403,
      code: "forbidden",
      diagnostics: `Patient-scoped token does not permit access to ${resourceLabel}.`,
    });
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const limiter = rateLimit(getIdentifier(req));
    if (!limiter.allowed) {
      return fhirError(429, "throttled", "Rate limit exceeded.");
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch {
      throw new HttpError({
        status: 400,
        code: "invalid",
        diagnostics: "Malformed JSON request body.",
      });
    }

    const action = asString(payload?.action);
    if (!action) {
      throw new HttpError({
        status: 422,
        code: "required",
        diagnostics: "action is required.",
      });
    }
    if (!isFhirAction(action)) {
      throw new HttpError({
        status: 400,
        code: "invalid",
        diagnostics: `Invalid action '${action}'.`,
      });
    }

    const supabaseUrl = (globalThis as any).Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = (globalThis as any).Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const data = payload?.data ?? {};
    const authorization = await authorizeFhirAction(req, supabase, action);

    switch (action) {
      case "export_patient":
        return await exportPatientToFHIR(supabase, authorization, data);
      case "import_patient":
        return await importPatientFromFHIR(supabase, authorization, data);
      case "sync_observations":
        return await syncObservations(supabase, authorization, data);
      case "export_encounter":
        return await exportEncounter(supabase, authorization, data);
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return fhirError(error.status, error.code, error.diagnostics, error.headers);
    }
    const diagnostics = error instanceof Error ? error.message : "Unexpected server error.";
    return fhirError(500, "exception", diagnostics);
  }
};

async function exportPatientToFHIR(
  supabase: any,
  authorization: ActionAuthorization,
  { patient_id }: any,
) {
  const patientId = asString(patient_id);
  if (!patientId) {
    throw new HttpError({
      status: 422,
      code: "required",
      diagnostics: "patient_id is required.",
    });
  }

  const { data: patient, error } = await supabase
    .from("patients")
    .select("id, hospital_id, mrn, first_name, last_name, email, phone, gender, date_of_birth, address, city, state, zip, created_at, updated_at")
    .eq("id", patientId)
    .maybeSingle();

  if (error) {
    throw new HttpError({
      status: 500,
      code: "exception",
      diagnostics: `Failed to load patient '${patientId}': ${error.message}`,
    });
  }
  if (!patient) {
    throw new HttpError({
      status: 404,
      code: "not-found",
      diagnostics: `Patient/${patientId} not found.`,
    });
  }
  enforceHospitalAccess(authorization, patient.hospital_id, `Patient/${patientId}`);
  enforcePatientScopeAccess(authorization, patient.id, `Patient/${patientId}`);

  const fhirPatient = mapPatientToFhir(patient);
  const versionId = fhirPatient.meta?.versionId;
  const headers: HeadersInit = {};
  if (versionId) {
    headers["ETag"] = `W/"${sanitizeWeakEtagValue(versionId)}"`;
  }

  return fhirResponse(fhirPatient, 200, headers);
}

async function importPatientFromFHIR(
  supabase: any,
  authorization: ActionAuthorization,
  { fhir_patient, hospital_id, mrn: explicitMrn }: any,
) {
  const patient = fhir_patient as FHIRPatient | undefined;
  if (!patient) {
    throw new HttpError({
      status: 422,
      code: "required",
      diagnostics: "fhir_patient is required.",
    });
  }
  if (patient.resourceType !== "Patient") {
    throw new HttpError({
      status: 400,
      code: "invalid",
      diagnostics: "resourceType must be 'Patient'.",
    });
  }
  if (patient.gender && !FHIR_GENDER_VALUES.has(patient.gender)) {
    throw new HttpError({
      status: 422,
      code: "value",
      diagnostics: `Invalid Patient.gender '${patient.gender}'.`,
    });
  }

  const { firstName, lastName } = getPatientName(patient);
  const birthDate = asString(patient.birthDate);
  if (!birthDate) {
    throw new HttpError({
      status: 422,
      code: "required",
      diagnostics: "Patient.birthDate is required for import.",
    });
  }

  const patientId = asString(patient.id) ?? crypto.randomUUID();
  const now = new Date().toISOString();

  const { data: existingPatient, error: existingPatientError } = await supabase
    .from("patients")
    .select("id, hospital_id, mrn")
    .eq("id", patientId)
    .maybeSingle();

  if (existingPatientError) {
    throw new HttpError({
      status: 500,
      code: "exception",
      diagnostics: `Failed to check patient existence: ${existingPatientError.message}`,
    });
  }

  if (existingPatient) {
    enforceHospitalAccess(authorization, existingPatient.hospital_id, `Patient/${patientId}`);
    enforcePatientScopeAccess(authorization, existingPatient.id, `Patient/${patientId}`);
  }

  const requestedHospitalId = asString(hospital_id);
  if (
    existingPatient?.hospital_id &&
    requestedHospitalId &&
    requestedHospitalId !== existingPatient.hospital_id
  ) {
    throw new HttpError({
      status: 422,
      code: "value",
      diagnostics: "hospital_id does not match the existing patient hospital assignment.",
    });
  }

  const hospitalId =
    existingPatient?.hospital_id ??
    requestedHospitalId ??
    authorization.requestAuth.hospitalId ??
    undefined;
  if (!hospitalId) {
    throw new HttpError({
      status: 422,
      code: "required",
      diagnostics: "hospital_id is required for importing a new patient.",
    });
  }
  if (!authorization.systemScoped) {
    const callerHospitalId = authorization.requestAuth.hospitalId;
    if (!callerHospitalId || hospitalId !== callerHospitalId) {
      throw new HttpError({
        status: 403,
        code: "forbidden",
        diagnostics: `Import to hospital '${hospitalId}' is forbidden for this caller.`,
      });
    }
  }

  const providedMrn = asString(explicitMrn) ?? getPatientMrn(patient) ?? existingPatient?.mrn ?? undefined;
  const mrn = providedMrn ?? await generateMrn(supabase, hospitalId);
  const address = getPatientAddress(patient);

  const patientData = {
    id: patientId,
    hospital_id: hospitalId,
    mrn,
    first_name: firstName,
    last_name: lastName,
    date_of_birth: birthDate,
    gender: mapGenderFromFhir(patient.gender),
    email: getTelecomValue(patient, "email") ?? null,
    phone: getTelecomValue(patient, "phone") ?? null,
    address: address.address ?? null,
    city: address.city ?? null,
    state: address.state ?? null,
    zip: address.zip ?? null,
    updated_at: now,
  };

  const dbOperation = existingPatient
    ? supabase
        .from("patients")
        .update(patientData)
        .eq("id", patientId)
        .select("id, mrn, first_name, last_name, email, phone, gender, date_of_birth, address, city, state, zip, created_at, updated_at")
        .single()
    : supabase
        .from("patients")
        .insert({ ...patientData, created_at: now })
        .select("id, mrn, first_name, last_name, email, phone, gender, date_of_birth, address, city, state, zip, created_at, updated_at")
        .single();

  const { data: savedPatient, error } = await dbOperation;

  if (error || !savedPatient) {
    throw new HttpError({
      status: 500,
      code: "exception",
      diagnostics: `Failed to import patient: ${error?.message ?? "Unknown database error."}`,
    });
  }

  const fhirPatient = mapPatientToFhir(savedPatient);
  const versionId = fhirPatient.meta?.versionId;
  const headers: HeadersInit = {};
  if (!existingPatient) headers["Location"] = `/Patient/${savedPatient.id}`;
  if (versionId) headers["ETag"] = `W/"${sanitizeWeakEtagValue(versionId)}"`;

  return fhirResponse(fhirPatient, existingPatient ? 200 : 201, headers);
}

async function syncObservations(
  supabase: any,
  authorization: ActionAuthorization,
  { patient_id, observations }: any,
) {
  const patientId = asString(patient_id);
  if (!patientId) {
    throw new HttpError({
      status: 422,
      code: "required",
      diagnostics: "patient_id is required.",
    });
  }
  if (!Array.isArray(observations) || observations.length === 0) {
    throw new HttpError({
      status: 422,
      code: "required",
      diagnostics: "observations must be a non-empty array.",
    });
  }

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id, hospital_id")
    .eq("id", patientId)
    .maybeSingle();
  if (patientError) {
    throw new HttpError({
      status: 500,
      code: "exception",
      diagnostics: `Failed to validate patient '${patientId}': ${patientError.message}`,
    });
  }
  if (!patient) {
    throw new HttpError({
      status: 404,
      code: "not-found",
      diagnostics: `Patient/${patientId} not found.`,
    });
  }
  enforceHospitalAccess(authorization, patient.hospital_id, `Patient/${patientId}`);
  enforcePatientScopeAccess(authorization, patient.id, `Patient/${patientId}`);

  const mappedVitalSigns = observations.map((obs: any, index: number) =>
    mapObservationToVitalSign(patientId, obs, index),
  );

  const { error } = await supabase
    .from("vital_signs")
    .insert(mappedVitalSigns);

  if (error) {
    throw new HttpError({
      status: 500,
      code: "exception",
      diagnostics: `Failed to sync observations: ${error.message}`,
    });
  }

  return fhirResponse(
    operationOutcome(
      "informational",
      `Synced ${mappedVitalSigns.length} Observation resource(s) to vital_signs.`,
      "information",
    ),
    200,
  );
}

async function exportEncounter(
  supabase: any,
  authorization: ActionAuthorization,
  { consultation_id }: any,
) {
  const consultationId = asString(consultation_id);
  if (!consultationId) {
    throw new HttpError({
      status: 422,
      code: "required",
      diagnostics: "consultation_id is required.",
    });
  }

  const { data: consultation, error } = await supabase
    .from("consultations")
    .select(`
      id,
      patient_id,
      doctor_id,
      hospital_id,
      status,
      created_at,
      updated_at,
      started_at,
      completed_at,
      chief_complaint,
      final_diagnosis,
      diagnoses
    `)
    .eq("id", consultationId)
    .maybeSingle();

  if (error) {
    throw new HttpError({
      status: 500,
      code: "exception",
      diagnostics: `Failed to load consultation '${consultationId}': ${error.message}`,
    });
  }
  if (!consultation) {
    throw new HttpError({
      status: 404,
      code: "not-found",
      diagnostics: `Encounter source consultation '${consultationId}' not found.`,
    });
  }
  enforceHospitalAccess(authorization, consultation.hospital_id, `Encounter/${consultation.id}`);
  enforcePatientScopeAccess(authorization, consultation.patient_id, `Encounter/${consultation.id}`);

  const encounterStatus = ENCOUNTER_STATUS_BY_CONSULTATION_STATUS[consultation.status ?? "pending"] ?? "in-progress";
  const diagnosisText = Array.isArray(consultation.final_diagnosis) && consultation.final_diagnosis.length > 0
    ? consultation.final_diagnosis[0]
    : undefined;
  const encounterPeriodStart = consultation.started_at ?? consultation.created_at;
  const encounterPeriodEnd = encounterStatus === "finished"
    ? consultation.completed_at ?? consultation.updated_at
    : undefined;
  const versionId = asString(consultation.updated_at) ?? asString(consultation.created_at) ?? new Date().toISOString();

  const fhirEncounter = {
    resourceType: "Encounter",
    id: consultation.id,
    meta: {
      versionId,
      lastUpdated: consultation.updated_at ?? consultation.created_at,
    },
    status: encounterStatus,
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "AMB",
      display: "ambulatory",
    },
    subject: {
      reference: `Patient/${consultation.patient_id}`,
    },
    participant: consultation.doctor_id ? [
      {
        individual: {
          reference: `Practitioner/${consultation.doctor_id}`,
        },
      },
    ] : [],
    period: {
      start: encounterPeriodStart,
      end: encounterPeriodEnd,
    },
    reasonCode: consultation.chief_complaint ? [
      {
        text: consultation.chief_complaint,
      },
    ] : [],
    diagnosis: diagnosisText ? [
      {
        condition: {
          display: diagnosisText,
        },
      },
    ] : [],
  };

  return fhirResponse(fhirEncounter, 200, {
    ETag: `W/"${sanitizeWeakEtagValue(versionId)}"`,
  });
}

serve(handler);
