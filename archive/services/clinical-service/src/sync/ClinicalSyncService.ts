import { FastifyInstance } from 'fastify';
import { Consultation, ClinicalWorkflow, MedicalRecord, ClinicalDecisionSupport } from '../types/clinical';
import { connectDatabase } from '../config/database';
import { connectRedis } from '../config/redis';

interface SyncResult {
  syncedRecords: number;
  conflicts: number;
  lastSyncTimestamp: Date;
}

interface SyncStatus {
  lastFullSync: Date | null;
  lastIncrementalSync: Date | null;
  pendingConflicts: number;
  totalRecords: number;
  isHealthy: boolean;
}

export class ClinicalSyncService {
  private lastSyncTimestamp: Date | null = null;
  private isSyncing = false;

  constructor(private fastify: FastifyInstance) {}

  async performFullSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    let syncedRecords = 0;
    let conflicts = 0;

    try {
      this.fastify.log.info('Starting full clinical data sync');

      // Sync consultations
      const consultationResult = await this.syncConsultations();
      syncedRecords += consultationResult.syncedRecords;
      conflicts += consultationResult.conflicts;

      // Sync clinical workflows
      const workflowResult = await this.syncClinicalWorkflows();
      syncedRecords += workflowResult.syncedRecords;
      conflicts += workflowResult.conflicts;

      // Sync medical records
      const recordResult = await this.syncMedicalRecords();
      syncedRecords += recordResult.syncedRecords;
      conflicts += recordResult.conflicts;

      // Sync clinical decision support
      const cdsResult = await this.syncClinicalDecisionSupport();
      syncedRecords += cdsResult.syncedRecords;
      conflicts += cdsResult.conflicts;

      this.lastSyncTimestamp = new Date();
      await this.updateLastSyncTimestamp();

      this.fastify.log.info(`Full clinical sync completed: ${syncedRecords} records synced, ${conflicts} conflicts`);

      return {
        syncedRecords,
        conflicts,
        lastSyncTimestamp: this.lastSyncTimestamp
      };

    } finally {
      this.isSyncing = false;
    }
  }

  async performIncrementalSync(): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    let syncedRecords = 0;
    let conflicts = 0;

    try {
      this.fastify.log.info('Starting incremental clinical data sync');

      const lastSync = this.lastSyncTimestamp || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      // Sync modified consultations
      const consultationResult = await this.syncModifiedConsultations(lastSync);
      syncedRecords += consultationResult.syncedRecords;
      conflicts += consultationResult.conflicts;

      // Sync modified workflows
      const workflowResult = await this.syncModifiedWorkflows(lastSync);
      syncedRecords += workflowResult.syncedRecords;
      conflicts += workflowResult.conflicts;

      // Sync modified medical records
      const recordResult = await this.syncModifiedMedicalRecords(lastSync);
      syncedRecords += recordResult.syncedRecords;
      conflicts += recordResult.conflicts;

      // Sync modified CDS
      const cdsResult = await this.syncModifiedClinicalDecisionSupport(lastSync);
      syncedRecords += cdsResult.syncedRecords;
      conflicts += cdsResult.conflicts;

      this.lastSyncTimestamp = new Date();
      await this.updateLastSyncTimestamp();

      return {
        syncedRecords,
        conflicts,
        lastSyncTimestamp: this.lastSyncTimestamp
      };

    } finally {
      this.isSyncing = false;
    }
  }

  async handleIncomingUpdate(recordType: string, recordData: any): Promise<void> {
    try {
      switch (recordType) {
        case 'consultation':
          await this.handleIncomingConsultationUpdate(recordData);
          break;
        case 'clinical_workflow':
          await this.handleIncomingWorkflowUpdate(recordData);
          break;
        case 'medical_record':
          await this.handleIncomingMedicalRecordUpdate(recordData);
          break;
        case 'clinical_decision_support':
          await this.handleIncomingCDSUpdate(recordData);
          break;
        default:
          this.fastify.log.warn(`Unknown record type: ${recordType}`);
      }

      this.fastify.log.info(`Processed incoming clinical update for ${recordType}: ${recordData.id}`);
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to handle incoming clinical update', error });
      throw error;
    }
  }

  async handleIncomingDeletion(recordType: string, recordId: string): Promise<void> {
    try {
      switch (recordType) {
        case 'consultation':
          await this.deleteConsultationFromMicroservice(recordId);
          break;
        case 'clinical_workflow':
          await this.deleteWorkflowFromMicroservice(recordId);
          break;
        case 'medical_record':
          await this.deleteMedicalRecordFromMicroservice(recordId);
          break;
        case 'clinical_decision_support':
          await this.deleteCDSFromMicroservice(recordId);
          break;
        default:
          this.fastify.log.warn(`Unknown record type: ${recordType}`);
      }

      this.fastify.log.info(`Processed incoming clinical deletion for ${recordType}: ${recordId}`);
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to handle incoming clinical deletion', error });
      throw error;
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const totalRecords = await this.getTotalClinicalRecords();
      const pendingConflicts = await this.getPendingConflictCount();

      return {
        lastFullSync: this.lastSyncTimestamp,
        lastIncrementalSync: new Date(), // This would be tracked separately
        pendingConflicts,
        totalRecords,
        isHealthy: !this.isSyncing
      };
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to get sync status', error });
      return {
        lastFullSync: this.lastSyncTimestamp,
        lastIncrementalSync: null,
        pendingConflicts: 0,
        totalRecords: 0,
        isHealthy: false
      };
    }
  }

  async shutdown(): Promise<void> {
    this.isSyncing = false;
    this.fastify.log.info('Clinical sync service shut down');
  }

  // Private sync methods for each entity type
  private async syncConsultations(): Promise<SyncResult> {
    let syncedRecords = 0;
    let conflicts = 0;

    const mainConsultations = await this.getConsultationsFromMainDB();
    const microserviceConsultations = await this.getConsultationsFromMicroserviceDB();

    const mainMap = new Map(mainConsultations.map(c => [c.id, c]));
    const microMap = new Map(microserviceConsultations.map(c => [c.id, c]));

    for (const [id, mainConsultation] of mainMap) {
      const microConsultation = microMap.get(id);

      if (!microConsultation) {
        await this.createConsultationInMicroservice(mainConsultation);
        syncedRecords++;
      } else {
        const conflict = await this.detectConsultationConflict(mainConsultation, microConsultation);
        if (conflict) {
          await this.recordConflict(conflict);
          conflicts++;
        } else {
          await this.updateConsultationInMicroservice(mainConsultation);
          syncedRecords++;
        }
      }
    }

    return { syncedRecords, conflicts, lastSyncTimestamp: new Date() };
  }

  private async syncClinicalWorkflows(): Promise<SyncResult> {
    let syncedRecords = 0;
    let conflicts = 0;

    const mainWorkflows = await this.getWorkflowsFromMainDB();
    const microserviceWorkflows = await this.getWorkflowsFromMicroserviceDB();

    const mainMap = new Map(mainWorkflows.map(w => [w.id, w]));
    const microMap = new Map(microserviceWorkflows.map(w => [w.id, w]));

    for (const [id, mainWorkflow] of mainMap) {
      const microWorkflow = microMap.get(id);

      if (!microWorkflow) {
        await this.createWorkflowInMicroservice(mainWorkflow);
        syncedRecords++;
      } else {
        const conflict = await this.detectWorkflowConflict(mainWorkflow, microWorkflow);
        if (conflict) {
          await this.recordConflict(conflict);
          conflicts++;
        } else {
          await this.updateWorkflowInMicroservice(mainWorkflow);
          syncedRecords++;
        }
      }
    }

    return { syncedRecords, conflicts, lastSyncTimestamp: new Date() };
  }

  private async syncMedicalRecords(): Promise<SyncResult> {
    let syncedRecords = 0;
    let conflicts = 0;

    const mainRecords = await this.getMedicalRecordsFromMainDB();
    const microserviceRecords = await this.getMedicalRecordsFromMicroserviceDB();

    const mainMap = new Map(mainRecords.map(r => [r.id, r]));
    const microMap = new Map(microserviceRecords.map(r => [r.id, r]));

    for (const [id, mainRecord] of mainMap) {
      const microRecord = microMap.get(id);

      if (!microRecord) {
        await this.createMedicalRecordInMicroservice(mainRecord);
        syncedRecords++;
      } else {
        const conflict = await this.detectMedicalRecordConflict(mainRecord, microRecord);
        if (conflict) {
          await this.recordConflict(conflict);
          conflicts++;
        } else {
          await this.updateMedicalRecordInMicroservice(mainRecord);
          syncedRecords++;
        }
      }
    }

    return { syncedRecords, conflicts, lastSyncTimestamp: new Date() };
  }

  private async syncClinicalDecisionSupport(): Promise<SyncResult> {
    let syncedRecords = 0;
    let conflicts = 0;

    const mainCDS = await this.getCDSFromMainDB();
    const microserviceCDS = await this.getCDSFromMicroserviceDB();

    const mainMap = new Map(mainCDS.map(c => [c.id, c]));
    const microMap = new Map(microserviceCDS.map(c => [c.id, c]));

    for (const [id, mainCDSItem] of mainMap) {
      const microCDSItem = microMap.get(id);

      if (!microCDSItem) {
        await this.createCDSInMicroservice(mainCDSItem);
        syncedRecords++;
      } else {
        const conflict = await this.detectCDSConflict(mainCDSItem, microCDSItem);
        if (conflict) {
          await this.recordConflict(conflict);
          conflicts++;
        } else {
          await this.updateCDSInMicroservice(mainCDSItem);
          syncedRecords++;
        }
      }
    }

    return { syncedRecords, conflicts, lastSyncTimestamp: new Date() };
  }

  // Incremental sync methods
  private async syncModifiedConsultations(since: Date): Promise<SyncResult> {
    let syncedRecords = 0;
    let conflicts = 0;

    const modifiedConsultations = await this.getModifiedConsultationsFromMainDB(since);

    for (const consultation of modifiedConsultations) {
      const existing = await this.getConsultationFromMicroserviceDB(consultation.id);

      if (!existing) {
        await this.createConsultationInMicroservice(consultation);
      } else {
        const conflict = await this.detectConsultationConflict(consultation, existing);
        if (conflict) {
          await this.recordConflict(conflict);
          conflicts++;
        } else {
          await this.updateConsultationInMicroservice(consultation);
        }
      }
      syncedRecords++;
    }

    return { syncedRecords, conflicts, lastSyncTimestamp: new Date() };
  }

  private async syncModifiedWorkflows(since: Date): Promise<SyncResult> {
    let syncedRecords = 0;
    let conflicts = 0;

    const modifiedWorkflows = await this.getModifiedWorkflowsFromMainDB(since);

    for (const workflow of modifiedWorkflows) {
      const existing = await this.getWorkflowFromMicroserviceDB(workflow.id);

      if (!existing) {
        await this.createWorkflowInMicroservice(workflow);
      } else {
        const conflict = await this.detectWorkflowConflict(workflow, existing);
        if (conflict) {
          await this.recordConflict(conflict);
          conflicts++;
        } else {
          await this.updateWorkflowInMicroservice(workflow);
        }
      }
      syncedRecords++;
    }

    return { syncedRecords, conflicts, lastSyncTimestamp: new Date() };
  }

  private async syncModifiedMedicalRecords(since: Date): Promise<SyncResult> {
    let syncedRecords = 0;
    let conflicts = 0;

    const modifiedRecords = await this.getModifiedMedicalRecordsFromMainDB(since);

    for (const record of modifiedRecords) {
      const existing = await this.getMedicalRecordFromMicroserviceDB(record.id);

      if (!existing) {
        await this.createMedicalRecordInMicroservice(record);
      } else {
        const conflict = await this.detectMedicalRecordConflict(record, existing);
        if (conflict) {
          await this.recordConflict(conflict);
          conflicts++;
        } else {
          await this.updateMedicalRecordInMicroservice(record);
        }
      }
      syncedRecords++;
    }

    return { syncedRecords, conflicts, lastSyncTimestamp: new Date() };
  }

  private async syncModifiedClinicalDecisionSupport(since: Date): Promise<SyncResult> {
    let syncedRecords = 0;
    let conflicts = 0;

    const modifiedCDS = await this.getModifiedCDSFromMainDB(since);

    for (const cds of modifiedCDS) {
      const existing = await this.getCDSFromMicroserviceDBById(cds.id);

      if (!existing) {
        await this.createCDSInMicroservice(cds);
      } else {
        const conflict = await this.detectCDSConflict(cds, existing);
        if (conflict) {
          await this.recordConflict(conflict);
          conflicts++;
        } else {
          await this.updateCDSInMicroservice(cds);
        }
      }
      syncedRecords++;
    }

    return { syncedRecords, conflicts, lastSyncTimestamp: new Date() };
  }

  // Handle incoming updates
  private async handleIncomingConsultationUpdate(consultation: Consultation): Promise<void> {
    const existing = await this.getConsultationFromMicroserviceDB(consultation.id);

    if (!existing) {
      await this.createConsultationInMicroservice(consultation);
    } else {
      const conflict = await this.detectConsultationConflict(consultation, existing);
      if (conflict) {
        await this.recordConflict(conflict);
      } else {
        await this.updateConsultationInMicroservice(consultation);
      }
    }
  }

  private async handleIncomingWorkflowUpdate(workflow: ClinicalWorkflow): Promise<void> {
    const existing = await this.getWorkflowFromMicroserviceDB(workflow.id);

    if (!existing) {
      await this.createWorkflowInMicroservice(workflow);
    } else {
      const conflict = await this.detectWorkflowConflict(workflow, existing);
      if (conflict) {
        await this.recordConflict(conflict);
      } else {
        await this.updateWorkflowInMicroservice(workflow);
      }
    }
  }

  private async handleIncomingMedicalRecordUpdate(record: MedicalRecord): Promise<void> {
    const existing = await this.getMedicalRecordFromMicroserviceDB(record.id);

    if (!existing) {
      await this.createMedicalRecordInMicroservice(record);
    } else {
      const conflict = await this.detectMedicalRecordConflict(record, existing);
      if (conflict) {
        await this.recordConflict(conflict);
      } else {
        await this.updateMedicalRecordInMicroservice(record);
      }
    }
  }

  private async handleIncomingCDSUpdate(cds: ClinicalDecisionSupport): Promise<void> {
    const existing = await this.getCDSFromMicroserviceDBById(cds.id);

    if (!existing) {
      await this.createCDSInMicroservice(cds);
    } else {
      const conflict = await this.detectCDSConflict(cds, existing);
      if (conflict) {
        await this.recordConflict(conflict);
      } else {
        await this.updateCDSInMicroservice(cds);
      }
    }
  }

  // Database operations (simplified - would connect to main DB in real implementation)
  private async getConsultationsFromMainDB(): Promise<Consultation[]> { return []; }
  private async getWorkflowsFromMainDB(): Promise<ClinicalWorkflow[]> { return []; }
  private async getMedicalRecordsFromMainDB(): Promise<MedicalRecord[]> { return []; }
  private async getCDSFromMainDB(): Promise<ClinicalDecisionSupport[]> { return []; }

  private async getModifiedConsultationsFromMainDB(since: Date): Promise<Consultation[]> { return []; }
  private async getModifiedWorkflowsFromMainDB(since: Date): Promise<ClinicalWorkflow[]> { return []; }
  private async getModifiedMedicalRecordsFromMainDB(since: Date): Promise<MedicalRecord[]> { return []; }
  private async getModifiedCDSFromMainDB(since: Date): Promise<ClinicalDecisionSupport[]> { return []; }

  private async getConsultationsFromMicroserviceDB(): Promise<Consultation[]> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM consultations');
    return result.rows;
  }

  private async getWorkflowsFromMicroserviceDB(): Promise<ClinicalWorkflow[]> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM clinical_workflows');
    return result.rows;
  }

  private async getMedicalRecordsFromMicroserviceDB(): Promise<MedicalRecord[]> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM medical_records');
    return result.rows;
  }

  private async getCDSFromMicroserviceDB(): Promise<ClinicalDecisionSupport[]> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM clinical_decision_support');
    return result.rows;
  }

  private async getConsultationFromMicroserviceDB(id: string): Promise<Consultation | null> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM consultations WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  private async getWorkflowFromMicroserviceDB(id: string): Promise<ClinicalWorkflow | null> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM clinical_workflows WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  private async getMedicalRecordFromMicroserviceDB(id: string): Promise<MedicalRecord | null> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM medical_records WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  private async getCDSFromMicroserviceDBById(id: string): Promise<ClinicalDecisionSupport | null> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM clinical_decision_support WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  // Create operations
  private async createConsultationInMicroservice(consultation: Consultation): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO consultations (id, patient_id, provider_id, appointment_id, hospital_id, consultation_type, status, chief_complaint, history_of_present_illness, vital_signs, physical_examination, assessment, plan, diagnosis_codes, procedure_codes, medications_prescribed, lab_orders, imaging_orders, follow_up_instructions, progress_notes, clinical_notes, started_at, completed_at, created_at, updated_at, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
    `, [
      consultation.id, consultation.patient_id, consultation.provider_id, consultation.appointment_id,
      consultation.hospital_id, consultation.consultation_type, consultation.status, consultation.chief_complaint,
      consultation.history_of_present_illness, JSON.stringify(consultation.vital_signs), consultation.physical_examination,
      consultation.assessment, consultation.plan, JSON.stringify(consultation.diagnosis_codes),
      JSON.stringify(consultation.procedure_codes), JSON.stringify(consultation.medications_prescribed),
      JSON.stringify(consultation.lab_orders), JSON.stringify(consultation.imaging_orders),
      consultation.follow_up_instructions, consultation.progress_notes, consultation.clinical_notes,
      consultation.started_at, consultation.completed_at, consultation.created_at, consultation.updated_at,
      consultation.created_by, consultation.updated_by
    ]);
  }

  private async createWorkflowInMicroservice(workflow: ClinicalWorkflow): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO clinical_workflows (id, consultation_id, patient_id, hospital_id, workflow_type, status, priority, current_step, steps, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      workflow.id, workflow.consultation_id, workflow.patient_id, workflow.hospital_id,
      workflow.workflow_type, workflow.status, workflow.priority, workflow.current_step,
      JSON.stringify(workflow.steps), JSON.stringify(workflow.metadata),
      workflow.created_at, workflow.updated_at
    ]);
  }

  private async createMedicalRecordInMicroservice(record: MedicalRecord): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO medical_records (id, patient_id, hospital_id, record_type, record_date, provider_id, title, content, attachments, tags, is_confidential, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      record.id, record.patient_id, record.hospital_id, record.record_type, record.record_date,
      record.provider_id, record.title, record.content, JSON.stringify(record.attachments),
      JSON.stringify(record.tags), record.is_confidential, record.created_at, record.updated_at
    ]);
  }

  private async createCDSInMicroservice(cds: ClinicalDecisionSupport): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO clinical_decision_support (id, patient_id, consultation_id, rule_type, severity, title, message, recommendations, evidence, is_acknowledged, acknowledged_by, acknowledged_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      cds.id, cds.patient_id, cds.consultation_id, cds.rule_type, cds.severity, cds.title,
      cds.message, JSON.stringify(cds.recommendations), cds.evidence, cds.is_acknowledged,
      cds.acknowledged_by, cds.acknowledged_at, cds.created_at
    ]);
  }

  // Update operations
  private async updateConsultationInMicroservice(consultation: Consultation): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE consultations
      SET patient_id = $2, provider_id = $3, appointment_id = $4, hospital_id = $5, consultation_type = $6, status = $7, chief_complaint = $8, history_of_present_illness = $9, vital_signs = $10, physical_examination = $11, assessment = $12, plan = $13, diagnosis_codes = $14, procedure_codes = $15, medications_prescribed = $16, lab_orders = $17, imaging_orders = $18, follow_up_instructions = $19, progress_notes = $20, clinical_notes = $21, started_at = $22, completed_at = $23, updated_at = $24, updated_by = $25
      WHERE id = $1
    `, [
      consultation.id, consultation.patient_id, consultation.provider_id, consultation.appointment_id,
      consultation.hospital_id, consultation.consultation_type, consultation.status, consultation.chief_complaint,
      consultation.history_of_present_illness, JSON.stringify(consultation.vital_signs), consultation.physical_examination,
      consultation.assessment, consultation.plan, JSON.stringify(consultation.diagnosis_codes),
      JSON.stringify(consultation.procedure_codes), JSON.stringify(consultation.medications_prescribed),
      JSON.stringify(consultation.lab_orders), JSON.stringify(consultation.imaging_orders),
      consultation.follow_up_instructions, consultation.progress_notes, consultation.clinical_notes,
      consultation.started_at, consultation.completed_at, consultation.updated_at, consultation.updated_by
    ]);
  }

  private async updateWorkflowInMicroservice(workflow: ClinicalWorkflow): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE clinical_workflows
      SET consultation_id = $2, patient_id = $3, hospital_id = $4, workflow_type = $5, status = $6, priority = $7, current_step = $8, steps = $9, metadata = $10, updated_at = $11
      WHERE id = $1
    `, [
      workflow.id, workflow.consultation_id, workflow.patient_id, workflow.hospital_id,
      workflow.workflow_type, workflow.status, workflow.priority, workflow.current_step,
      JSON.stringify(workflow.steps), JSON.stringify(workflow.metadata), workflow.updated_at
    ]);
  }

  private async updateMedicalRecordInMicroservice(record: MedicalRecord): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE medical_records
      SET patient_id = $2, hospital_id = $3, record_type = $4, record_date = $5, provider_id = $6, title = $7, content = $8, attachments = $9, tags = $10, is_confidential = $11, updated_at = $12
      WHERE id = $1
    `, [
      record.id, record.patient_id, record.hospital_id, record.record_type, record.record_date,
      record.provider_id, record.title, record.content, JSON.stringify(record.attachments),
      JSON.stringify(record.tags), record.is_confidential, record.updated_at
    ]);
  }

  private async updateCDSInMicroservice(cds: ClinicalDecisionSupport): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE clinical_decision_support
      SET patient_id = $2, consultation_id = $3, rule_type = $4, severity = $5, title = $6, message = $7, recommendations = $8, evidence = $9, is_acknowledged = $10, acknowledged_by = $11, acknowledged_at = $12
      WHERE id = $1
    `, [
      cds.id, cds.patient_id, cds.consultation_id, cds.rule_type, cds.severity, cds.title,
      cds.message, JSON.stringify(cds.recommendations), cds.evidence, cds.is_acknowledged,
      cds.acknowledged_by, cds.acknowledged_at
    ]);
  }

  // Delete operations
  private async deleteConsultationFromMicroservice(id: string): Promise<void> {
    const pool = connectDatabase();
    await pool.query('DELETE FROM consultations WHERE id = $1', [id]);
  }

  private async deleteWorkflowFromMicroservice(id: string): Promise<void> {
    const pool = connectDatabase();
    await pool.query('DELETE FROM clinical_workflows WHERE id = $1', [id]);
  }

  private async deleteMedicalRecordFromMicroservice(id: string): Promise<void> {
    const pool = connectDatabase();
    await pool.query('DELETE FROM medical_records WHERE id = $1', [id]);
  }

  private async deleteCDSFromMicroservice(id: string): Promise<void> {
    const pool = connectDatabase();
    await pool.query('DELETE FROM clinical_decision_support WHERE id = $1', [id]);
  }

  // Conflict detection
  private async detectConsultationConflict(main: Consultation, micro: Consultation): Promise<any | null> {
    if (main.updated_at > micro.updated_at) {
      if (this.consultationDataDiffers(main, micro)) {
        return {
          recordId: main.id,
          recordType: 'consultation',
          mainData: main,
          microserviceData: micro,
          conflictType: 'data_mismatch',
          detectedAt: new Date()
        };
      }
    }
    return null;
  }

  private async detectWorkflowConflict(main: ClinicalWorkflow, micro: ClinicalWorkflow): Promise<any | null> {
    if (main.updated_at > micro.updated_at) {
      if (this.workflowDataDiffers(main, micro)) {
        return {
          recordId: main.id,
          recordType: 'clinical_workflow',
          mainData: main,
          microserviceData: micro,
          conflictType: 'data_mismatch',
          detectedAt: new Date()
        };
      }
    }
    return null;
  }

  private async detectMedicalRecordConflict(main: MedicalRecord, micro: MedicalRecord): Promise<any | null> {
    if (main.updated_at > micro.updated_at) {
      if (this.medicalRecordDataDiffers(main, micro)) {
        return {
          recordId: main.id,
          recordType: 'medical_record',
          mainData: main,
          microserviceData: micro,
          conflictType: 'data_mismatch',
          detectedAt: new Date()
        };
      }
    }
    return null;
  }

  private async detectCDSConflict(main: ClinicalDecisionSupport, micro: ClinicalDecisionSupport): Promise<any | null> {
    if (main.created_at > micro.created_at) {
      if (this.cdsDataDiffers(main, micro)) {
        return {
          recordId: main.id,
          recordType: 'clinical_decision_support',
          mainData: main,
          microserviceData: micro,
          conflictType: 'data_mismatch',
          detectedAt: new Date()
        };
      }
    }
    return null;
  }

  // Data difference checks
  private consultationDataDiffers(c1: Consultation, c2: Consultation): boolean {
    return c1.patient_id !== c2.patient_id ||
           c1.provider_id !== c2.provider_id ||
           c1.status !== c2.status ||
           c1.chief_complaint !== c2.chief_complaint ||
           c1.assessment !== c2.assessment;
  }

  private workflowDataDiffers(w1: ClinicalWorkflow, w2: ClinicalWorkflow): boolean {
    return w1.status !== w2.status ||
           w1.priority !== w2.priority ||
           w1.current_step !== w2.current_step;
  }

  private medicalRecordDataDiffers(r1: MedicalRecord, r2: MedicalRecord): boolean {
    return r1.title !== r2.title ||
           r1.content !== r2.content ||
           r1.record_type !== r2.record_type;
  }

  private cdsDataDiffers(c1: ClinicalDecisionSupport, c2: ClinicalDecisionSupport): boolean {
    return c1.severity !== c2.severity ||
           c1.message !== c2.message ||
           c1.is_acknowledged !== c2.is_acknowledged;
  }

  // Conflict recording
  private async recordConflict(conflict: any): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO sync_conflicts (id, record_id, record_type, conflict_type, main_data, microservice_data, detected_at, status)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'pending')
    `, [
      conflict.recordId,
      conflict.recordType,
      conflict.conflictType,
      JSON.stringify(conflict.mainData),
      JSON.stringify(conflict.microserviceData),
      conflict.detectedAt
    ]);
  }

  // Utility methods
  private async updateLastSyncTimestamp(): Promise<void> {
    const redis = connectRedis();
    const client = await redis;
    await client.set('clinical_sync:last_sync', this.lastSyncTimestamp!.toISOString());
  }

  private async getTotalClinicalRecords(): Promise<number> {
    const pool = connectDatabase();
    const consultations = await pool.query('SELECT COUNT(*) as count FROM consultations');
    const workflows = await pool.query('SELECT COUNT(*) as count FROM clinical_workflows');
    const records = await pool.query('SELECT COUNT(*) as count FROM medical_records');
    const cds = await pool.query('SELECT COUNT(*) as count FROM clinical_decision_support');

    return parseInt(consultations.rows[0].count) +
           parseInt(workflows.rows[0].count) +
           parseInt(records.rows[0].count) +
           parseInt(cds.rows[0].count);
  }

  private async getPendingConflictCount(): Promise<number> {
    const pool = connectDatabase();
    const result = await pool.query("SELECT COUNT(*) as count FROM sync_conflicts WHERE status = 'pending'");
    return parseInt(result.rows[0].count);
  }
}