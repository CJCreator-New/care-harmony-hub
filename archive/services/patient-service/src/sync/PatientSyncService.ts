import { FastifyInstance } from 'fastify';
import { Patient } from '../types/patient';
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

export class PatientSyncService {
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
      this.fastify.log.info('Starting full patient data sync');

      // Get all patients from main database
      const mainPatients = await this.getPatientsFromMainDB();

      // Get all patients from microservice database
      const microservicePatients = await this.getPatientsFromMicroserviceDB();

      // Create maps for efficient lookup
      const mainPatientMap = new Map(mainPatients.map(p => [p.id, p]));
      const microservicePatientMap = new Map(microservicePatients.map(p => [p.id, p]));

      // Sync each patient
      for (const [patientId, mainPatient] of mainPatientMap) {
        const microservicePatient = microservicePatientMap.get(patientId);

        if (!microservicePatient) {
          // New patient in main DB, create in microservice
          await this.createPatientInMicroservice(mainPatient);
          syncedRecords++;
        } else {
          // Check for conflicts
          const conflict = await this.detectConflict(mainPatient, microservicePatient);
          if (conflict) {
            await this.recordConflict(conflict);
            conflicts++;
          } else {
            // Update microservice with latest data
            await this.updatePatientInMicroservice(mainPatient);
            syncedRecords++;
          }
        }
      }

      // Handle patients that exist in microservice but not in main DB
      for (const [patientId, microservicePatient] of microservicePatientMap) {
        if (!mainPatientMap.has(patientId)) {
          // This might be a deletion or data inconsistency
          this.fastify.log.warn(`Patient ${patientId} exists in microservice but not in main DB`);
        }
      }

      this.lastSyncTimestamp = new Date();
      await this.updateLastSyncTimestamp();

      this.fastify.log.info(`Full sync completed: ${syncedRecords} records synced, ${conflicts} conflicts`);

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
      this.fastify.log.info('Starting incremental patient data sync');

      const lastSync = this.lastSyncTimestamp || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      // Get patients modified since last sync
      const modifiedPatients = await this.getModifiedPatientsFromMainDB(lastSync);

      for (const patient of modifiedPatients) {
        const existingPatient = await this.getPatientFromMicroserviceDB(patient.id);

        if (!existingPatient) {
          await this.createPatientInMicroservice(patient);
        } else {
          const conflict = await this.detectConflict(patient, existingPatient);
          if (conflict) {
            await this.recordConflict(conflict);
            conflicts++;
          } else {
            await this.updatePatientInMicroservice(patient);
          }
        }
        syncedRecords++;
      }

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

  async handleIncomingUpdate(patientData: Patient): Promise<void> {
    try {
      const existingPatient = await this.getPatientFromMicroserviceDB(patientData.id);

      if (!existingPatient) {
        await this.createPatientInMicroservice(patientData);
      } else {
        const conflict = await this.detectConflict(patientData, existingPatient);
        if (conflict) {
          await this.recordConflict(conflict);
        } else {
          await this.updatePatientInMicroservice(patientData);
        }
      }

      this.fastify.log.info(`Processed incoming patient update for ID: ${patientData.id}`);
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to handle incoming patient update', error });
      throw error;
    }
  }

  async handleIncomingDeletion(patientId: string): Promise<void> {
    try {
      await this.deletePatientFromMicroservice(patientId);
      this.fastify.log.info(`Processed incoming patient deletion for ID: ${patientId}`);
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to handle incoming patient deletion', error });
      throw error;
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const totalRecords = await this.getTotalPatientCount();
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
    this.fastify.log.info('Patient sync service shut down');
  }

  // Private helper methods
  private async getPatientsFromMainDB(): Promise<Patient[]> {
    // This would connect to the main application database
    // For now, return mock data
    return [];
  }

  private async getPatientsFromMicroserviceDB(): Promise<Patient[]> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM patients');
    return result.rows;
  }

  private async getPatientFromMicroserviceDB(patientId: string): Promise<Patient | null> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [patientId]);
    return result.rows[0] || null;
  }

  private async getModifiedPatientsFromMainDB(since: Date): Promise<Patient[]> {
    // This would query the main DB for patients modified since the given date
    return [];
  }

  private async createPatientInMicroservice(patient: Patient): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO patients (id, hospital_id, medical_record_number, first_name, last_name, date_of_birth, gender, email, phone, status, created_at, updated_at, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      patient.id,
      patient.hospital_id,
      patient.medical_record_number,
      patient.first_name,
      patient.last_name,
      patient.date_of_birth,
      patient.gender,
      patient.email,
      patient.phone,
      patient.status,
      patient.created_at,
      patient.updated_at,
      patient.created_by,
      patient.updated_by
    ]);
  }

  private async updatePatientInMicroservice(patient: Patient): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE patients
      SET hospital_id = $2, medical_record_number = $3, first_name = $4, last_name = $5, date_of_birth = $6, gender = $7, email = $8, phone = $9, status = $10, updated_at = $11, updated_by = $12
      WHERE id = $1
    `, [
      patient.id,
      patient.hospital_id,
      patient.medical_record_number,
      patient.first_name,
      patient.last_name,
      patient.date_of_birth,
      patient.gender,
      patient.email,
      patient.phone,
      patient.status,
      patient.updated_at,
      patient.updated_by
    ]);
  }

  private async deletePatientFromMicroservice(patientId: string): Promise<void> {
    const pool = connectDatabase();
    await pool.query('DELETE FROM patients WHERE id = $1', [patientId]);
  }

  private async detectConflict(mainPatient: Patient, microservicePatient: Patient): Promise<any | null> {
    // Simple conflict detection based on update timestamps
    if (mainPatient.updated_at > microservicePatient.updated_at) {
      // Check if actual data differs
      if (this.patientDataDiffers(mainPatient, microservicePatient)) {
        return {
          patientId: mainPatient.id,
          mainData: mainPatient,
          microserviceData: microservicePatient,
          conflictType: 'data_mismatch',
          detectedAt: new Date()
        };
      }
    }
    return null;
  }

  private patientDataDiffers(patient1: Patient, patient2: Patient): boolean {
    return patient1.first_name !== patient2.first_name ||
           patient1.last_name !== patient2.last_name ||
           patient1.email !== patient2.email ||
           patient1.phone !== patient2.phone ||
           patient1.medical_record_number !== patient2.medical_record_number ||
           patient1.date_of_birth !== patient2.date_of_birth;
  }

  private async recordConflict(conflict: any): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO sync_conflicts (id, patient_id, conflict_type, main_data, microservice_data, detected_at, status)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'pending')
    `, [
      conflict.patientId,
      conflict.conflictType,
      JSON.stringify(conflict.mainData),
      JSON.stringify(conflict.microserviceData),
      conflict.detectedAt
    ]);
  }

  private async updateLastSyncTimestamp(): Promise<void> {
    const redis = connectRedis();
    await redis.set('patient_sync:last_sync', this.lastSyncTimestamp!.toISOString());
  }

  private async getTotalPatientCount(): Promise<number> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT COUNT(*) as count FROM patients');
    return parseInt(result.rows[0].count);
  }

  private async getPendingConflictCount(): Promise<number> {
    const pool = connectDatabase();
    const result = await pool.query("SELECT COUNT(*) as count FROM sync_conflicts WHERE status = 'pending'");
    return parseInt(result.rows[0].count);
  }
}