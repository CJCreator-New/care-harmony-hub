/**
 * Unified Clinical Order Safety Engine (`OrderSafetyEngine`) - Ports
 *
 * Ports & Adapters Architecture (Hexagonal Architecture)
 * Defines clean boundary ports for internal and external dependencies.
 * Each port MUST have at least two adapters:
 * 1. Production adapter (Supabase / HTTP)
 * 2. In-memory test adapter (Deterministic unit testing without network I/O)
 */

export interface ActivePatientMedication {
  readonly drugName: string;
  readonly drugRxcui?: string;
  readonly dosageMg?: number;
}

export interface LocalContraindicationRule {
  readonly primaryDrug: string;
  readonly interactingDrug: string;
  readonly severity: 'contraindicated' | 'serious' | 'moderate' | 'minor';
  readonly clinicalRecommendation: string;
}

export interface LocalDdiRepositoryPort {
  /**
   * Fetch active prescriptions for a patient within the scoped hospital tenant
   */
  getPatientActiveMedications(
    patientId: string,
    hospitalId: string
  ): Promise<readonly ActivePatientMedication[]>;

  /**
   * Check local hospital database for known contraindication pairs
   */
  findLocalContraindications(
    drugNameOrRxcui: string,
    hospitalId: string
  ): Promise<readonly LocalContraindicationRule[]>;
}

export interface TerminologyInteraction {
  readonly drug1: string;
  readonly drug2: string;
  readonly severity: 'high' | 'medium' | 'low' | 'unknown';
  readonly description: string;
}

export interface RxNormTerminologyPort {
  /**
   * Query RxNorm terminology interaction API with circuit breaker & timeout
   */
  checkInteractions(
    rxcuis: readonly string[],
    signal?: AbortSignal
  ): Promise<{
    readonly interactions: readonly TerminologyInteraction[];
    readonly isDegraded: boolean;
    readonly error?: string;
  }>;
}

export interface AuditSafetyEvent {
  readonly hospitalId: string;
  readonly performedBy: string;
  readonly actionType: string;
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly details: Record<string, unknown>;
}

export interface AuditLoggerPort {
  /**
   * Atomically write an immutable record to public.audit_logs
   */
  logSafetyEvent(event: AuditSafetyEvent): Promise<string>;
}
