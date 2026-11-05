/**
 * Pharmacy Service Sync Types
 * Replaces generic `any` types with discriminated unions and proper TypeScript types
 */

// Sync Operation Results
export interface SyncSummary {
  total: number;
  synced: number;
  conflicts: number;
}

export interface FullSyncResult {
  prescriptions: SyncSummary;
  medications: SyncSummary;
  inventory: SyncSummary;
  orders: SyncSummary;
  timestamp: string;
}

export interface IncrementalSyncResult {
  prescriptions: SyncSummary;
  medications: SyncSummary;
  inventory: SyncSummary;
  orders: SyncSummary;
  timestamp: string;
}

export interface SpecificEntitySyncResult {
  synced: number;
  failed?: number;
  skipped?: number;
}

// Conflict Detection
export interface ConflictRecord<T> {
  recordId: string;
  recordType: 'prescription' | 'medication' | 'inventory_item' | 'pharmacy_order';
  mainData: T;
  microserviceData: T;
  conflictType: 'data_mismatch' | 'version_conflict' | 'orphaned_record';
  timestamp: string;
  resolutionStrategy?: 'main_wins' | 'micro_wins' | 'manual_review';
}

// Event Types (discriminated union)
export type PharmacyEvent =
  | { eventType: 'PRESCRIPTION_CREATED'; payload: PrescriptionPayload; timestamp: string }
  | { eventType: 'PRESCRIPTION_UPDATED'; payload: PrescriptionPayload; timestamp: string }
  | { eventType: 'PRESCRIPTION_DELETED'; payload: { id: string }; timestamp: string }
  | { eventType: 'MEDICATION_CREATED'; payload: MedicationPayload; timestamp: string }
  | { eventType: 'MEDICATION_UPDATED'; payload: MedicationPayload; timestamp: string }
  | { eventType: 'MEDICATION_DELETED'; payload: { id: string }; timestamp: string }
  | { eventType: 'INVENTORY_CREATED'; payload: InventoryPayload; timestamp: string }
  | { eventType: 'INVENTORY_UPDATED'; payload: InventoryPayload; timestamp: string }
  | { eventType: 'INVENTORY_DELETED'; payload: { id: string }; timestamp: string }
  | { eventType: 'ORDER_CREATED'; payload: PharmacyOrderPayload; timestamp: string }
  | { eventType: 'ORDER_UPDATED'; payload: PharmacyOrderPayload; timestamp: string }
  | { eventType: 'ORDER_DELETED'; payload: { id: string }; timestamp: string }
  | { eventType: 'SYNC_COMMAND'; payload: SyncCommandPayload; timestamp: string };

// Payload Types
export interface PrescriptionPayload {
  id: string;
  patient_id: string;
  provider_id: string;
  medication_id: string;
  dosage: string;
  frequency: string;
  duration: number;
  quantity: number;
  instructions: string;
  status: 'active' | 'completed' | 'cancelled' | 'suspended';
  start_date: Date;
  end_date?: Date;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
  hospital_id: string;
}

export interface MedicationPayload {
  id: string;
  name: string;
  generic_name?: string;
  brand_name?: string;
  strength: string;
  form: string;
  category: string;
  requires_prescription: boolean;
  controlled_substance: boolean;
  dea_schedule?: string;
  created_at: Date;
  updated_at: Date;
  hospital_id: string;
}

export interface InventoryPayload {
  id: string;
  medication_id: string;
  batch_number: string;
  expiration_date: Date;
  quantity_on_hand: number;
  quantity_reserved: number;
  unit_cost: number;
  selling_price: number;
  location: string;
  status: 'active' | 'expired' | 'discontinued';
  created_at: Date;
  updated_at: Date;
  hospital_id: string;
}

export interface PharmacyOrderPayload {
  id: string;
  prescription_id: string;
  patient_id: string;
  medication_id: string;
  quantity: number;
  status: 'pending' | 'filled' | 'partially_filled' | 'cancelled';
  filled_date?: Date;
  filled_by?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  hospital_id: string;
}

export interface SyncCommandPayload {
  command: 'FULL_SYNC' | 'INCREMENTAL_SYNC' | 'PAUSE' | 'RESUME' | 'RESET';
  data?: Record<string, unknown>;
}

// User Statistics for Anomaly Detection
export interface UserStatistics {
  userId: string;
  totalActions: number;
  actionsByType: Record<string, number>;
  averageRequestsPerHour: number;
  latestAction: Date;
  suspiciousPatterns: string[];
  riskScore: number;
}

// Audit Log Entry
export interface AuditLogEntry {
  timestamp: Date;
  userId: string;
  action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC' | 'CONFLICT_RESOLUTION';
  resource: string;
  resourceId?: string;
  details: Record<string, string | number | boolean>;
  ipAddress?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE';
  error?: string;
}

// Security Alert
export interface SecurityAlert {
  id: string;
  type:
    | 'UNUSUAL_ACCESS_PATTERN'
    | 'BULK_DATA_ACCESS'
    | 'FAILED_AUTH'
    | 'PHI_EXPOSURE_ATTEMPT'
    | 'PRIVILEGE_ESCALATION'
    | 'DATA_CORRUPTION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId: string;
  description: string;
  detectedAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// Validation Status
export type ValidationStatus = 'VALID' | 'INVALID' | 'QUARANTINED' | 'CORRECTED';

export interface ValidationResult {
  status: ValidationStatus;
  errors?: string[];
  warnings?: string[];
  sanitizedData?: unknown;
  correctionsSuggested?: Record<string, unknown>;
}

// Sync Status Report
export interface SyncStatusReport {
  lastFullSync?: Date;
  lastIncrementalSync?: Date;
  pendingConflicts: number;
  failedSyncs: number;
  successfulSyncs: number;
  averageSyncDuration: number;
  nextScheduledSync?: Date;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
}
