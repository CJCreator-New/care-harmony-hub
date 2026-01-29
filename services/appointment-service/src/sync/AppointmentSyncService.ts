import { FastifyInstance } from 'fastify';
import { Appointment } from '../types/appointment';
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

export class AppointmentSyncService {
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
      this.fastify.log.info('Starting full appointment data sync');

      // Get all appointments from main database
      const mainAppointments = await this.getAppointmentsFromMainDB();

      // Get all appointments from microservice database
      const microserviceAppointments = await this.getAppointmentsFromMicroserviceDB();

      // Create maps for efficient lookup
      const mainAppointmentMap = new Map(mainAppointments.map(a => [a.id, a]));
      const microserviceAppointmentMap = new Map(microserviceAppointments.map(a => [a.id, a]));

      // Sync each appointment
      for (const [appointmentId, mainAppointment] of mainAppointmentMap) {
        const microserviceAppointment = microserviceAppointmentMap.get(appointmentId);

        if (!microserviceAppointment) {
          // New appointment in main DB, create in microservice
          await this.createAppointmentInMicroservice(mainAppointment);
          syncedRecords++;
        } else {
          // Check for conflicts
          const conflict = await this.detectConflict(mainAppointment, microserviceAppointment);
          if (conflict) {
            await this.recordConflict(conflict);
            conflicts++;
          } else {
            // Update microservice with latest data
            await this.updateAppointmentInMicroservice(mainAppointment);
            syncedRecords++;
          }
        }
      }

      // Handle appointments that exist in microservice but not in main DB
      for (const [appointmentId, microserviceAppointment] of microserviceAppointmentMap) {
        if (!mainAppointmentMap.has(appointmentId)) {
          // This might be a deletion or data inconsistency
          this.fastify.log.warn(`Appointment ${appointmentId} exists in microservice but not in main DB`);
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
      this.fastify.log.info('Starting incremental appointment data sync');

      const lastSync = this.lastSyncTimestamp || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      // Get appointments modified since last sync
      const modifiedAppointments = await this.getModifiedAppointmentsFromMainDB(lastSync);

      for (const appointment of modifiedAppointments) {
        const existingAppointment = await this.getAppointmentFromMicroserviceDB(appointment.id);

        if (!existingAppointment) {
          await this.createAppointmentInMicroservice(appointment);
        } else {
          const conflict = await this.detectConflict(appointment, existingAppointment);
          if (conflict) {
            await this.recordConflict(conflict);
            conflicts++;
          } else {
            await this.updateAppointmentInMicroservice(appointment);
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

  async handleIncomingUpdate(appointmentData: Appointment): Promise<void> {
    try {
      const existingAppointment = await this.getAppointmentFromMicroserviceDB(appointmentData.id);

      if (!existingAppointment) {
        await this.createAppointmentInMicroservice(appointmentData);
      } else {
        const conflict = await this.detectConflict(appointmentData, existingAppointment);
        if (conflict) {
          await this.recordConflict(conflict);
        } else {
          await this.updateAppointmentInMicroservice(appointmentData);
        }
      }

      this.fastify.log.info(`Processed incoming appointment update for ID: ${appointmentData.id}`);
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to handle incoming appointment update', error });
      throw error;
    }
  }

  async handleIncomingDeletion(appointmentId: string): Promise<void> {
    try {
      await this.deleteAppointmentFromMicroservice(appointmentId);
      this.fastify.log.info(`Processed incoming appointment deletion for ID: ${appointmentId}`);
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to handle incoming appointment deletion', error });
      throw error;
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const totalRecords = await this.getTotalAppointmentCount();
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
    this.fastify.log.info('Appointment sync service shut down');
  }

  // Private helper methods
  private async getAppointmentsFromMainDB(): Promise<Appointment[]> {
    // This would connect to the main application database
    // For now, return mock data
    return [];
  }

  private async getAppointmentsFromMicroserviceDB(): Promise<Appointment[]> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM appointments');
    return result.rows;
  }

  private async getAppointmentFromMicroserviceDB(appointmentId: string): Promise<Appointment | null> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
    return result.rows[0] || null;
  }

  private async getModifiedAppointmentsFromMainDB(since: Date): Promise<Appointment[]> {
    // This would query the main DB for appointments modified since the given date
    return [];
  }

  private async createAppointmentInMicroservice(appointment: Appointment): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO appointments (id, patient_id, provider_id, hospital_id, appointment_type, scheduled_at, duration, status, notes, reason_for_visit, location, virtual_meeting_link, created_at, updated_at, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `, [
      appointment.id,
      appointment.patient_id,
      appointment.provider_id,
      appointment.hospital_id,
      appointment.appointment_type,
      appointment.scheduled_at,
      appointment.duration,
      appointment.status,
      appointment.notes,
      appointment.reason_for_visit,
      appointment.location,
      appointment.virtual_meeting_link,
      appointment.created_at,
      appointment.updated_at,
      appointment.created_by,
      appointment.updated_by
    ]);
  }

  private async updateAppointmentInMicroservice(appointment: Appointment): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE appointments
      SET patient_id = $2, provider_id = $3, hospital_id = $4, appointment_type = $5, scheduled_at = $6, duration = $7, status = $8, notes = $9, reason_for_visit = $10, location = $11, virtual_meeting_link = $12, updated_at = $13, updated_by = $14
      WHERE id = $1
    `, [
      appointment.id,
      appointment.patient_id,
      appointment.provider_id,
      appointment.hospital_id,
      appointment.appointment_type,
      appointment.scheduled_at,
      appointment.duration,
      appointment.status,
      appointment.notes,
      appointment.reason_for_visit,
      appointment.location,
      appointment.virtual_meeting_link,
      appointment.updated_at,
      appointment.updated_by
    ]);
  }

  private async deleteAppointmentFromMicroservice(appointmentId: string): Promise<void> {
    const pool = connectDatabase();
    await pool.query('DELETE FROM appointments WHERE id = $1', [appointmentId]);
  }

  private async detectConflict(mainAppointment: Appointment, microserviceAppointment: Appointment): Promise<any | null> {
    // Simple conflict detection based on update timestamps
    if (mainAppointment.updated_at > microserviceAppointment.updated_at) {
      // Check if actual data differs
      if (this.appointmentDataDiffers(mainAppointment, microserviceAppointment)) {
        return {
          appointmentId: mainAppointment.id,
          mainData: mainAppointment,
          microserviceData: microserviceAppointment,
          conflictType: 'data_mismatch',
          detectedAt: new Date()
        };
      }
    }
    return null;
  }

  private appointmentDataDiffers(appointment1: Appointment, appointment2: Appointment): boolean {
    return appointment1.patient_id !== appointment2.patient_id ||
           appointment1.provider_id !== appointment2.provider_id ||
           appointment1.scheduled_at !== appointment2.scheduled_at ||
           appointment1.status !== appointment2.status ||
           appointment1.reason_for_visit !== appointment2.reason_for_visit;
  }

  private async recordConflict(conflict: any): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO sync_conflicts (id, appointment_id, conflict_type, main_data, microservice_data, detected_at, status)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'pending')
    `, [
      conflict.appointmentId,
      conflict.conflictType,
      JSON.stringify(conflict.mainData),
      JSON.stringify(conflict.microserviceData),
      conflict.detectedAt
    ]);
  }

  private async updateLastSyncTimestamp(): Promise<void> {
    const redis = connectRedis();
    const client = await redis;
    await client.set('appointment_sync:last_sync', this.lastSyncTimestamp!.toISOString());
  }

  private async getTotalAppointmentCount(): Promise<number> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT COUNT(*) as count FROM appointments');
    return parseInt(result.rows[0].count);
  }

  private async getPendingConflictCount(): Promise<number> {
    const pool = connectDatabase();
    const result = await pool.query("SELECT COUNT(*) as count FROM sync_conflicts WHERE status = 'pending'");
    return parseInt(result.rows[0].count);
  }
}