import { FastifyInstance } from 'fastify';
import {
  LabOrder,
  LabResult,
  CriticalValueNotification,
  SpecimenTracking,
  LabQCResult,
  LabInstrument,
  ResultValidation
} from '../types/laboratory';
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

export class LaboratorySyncService {
  private lastSyncTimestamp: Date | null = null;
  private isSyncing = false;

  constructor(private fastify: FastifyInstance) {}

  async performFullSync(): Promise<SyncResult> {
    const pool = connectDatabase();
    const redis = await connectRedis();

    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    let syncedRecords = 0;
    let conflicts = 0;

    try {
      this.fastify.log.info('Starting full laboratory data sync');

      // Sync lab orders
      const orderResult = await this.syncLabOrders();
      syncedRecords += orderResult.syncedRecords;
      conflicts += orderResult.conflicts;

      // Sync lab results
      const resultSync = await this.syncLabResults();
      syncedRecords += resultSync.syncedRecords;
      conflicts += resultSync.conflicts;

      // Sync critical value notifications
      const criticalResult = await this.syncCriticalValueNotifications();
      syncedRecords += criticalResult.syncedRecords;
      conflicts += criticalResult.conflicts;

      // Sync specimen tracking
      const specimenResult = await this.syncSpecimenTracking();
      syncedRecords += specimenResult.syncedRecords;
      conflicts += specimenResult.conflicts;

      // Sync QC results
      const qcResult = await this.syncLabQCResults();
      syncedRecords += qcResult.syncedRecords;
      conflicts += qcResult.conflicts;

      // Sync lab instruments
      const instrumentResult = await this.syncLabInstruments();
      syncedRecords += instrumentResult.syncedRecords;
      conflicts += instrumentResult.conflicts;

      // Sync result validations
      const validationResult = await this.syncResultValidations();
      syncedRecords += validationResult.syncedRecords;
      conflicts += validationResult.conflicts;

      this.lastSyncTimestamp = new Date();
      await this.updateLastSyncTimestamp();

      // Update sync metadata in Redis
      await redis.set('lab_sync:last_full_sync', new Date().toISOString());

      this.fastify.log.info(`Full laboratory sync completed: ${syncedRecords} records synced, ${conflicts} conflicts`);

      return {
        syncedRecords,
        conflicts,
        lastSyncTimestamp: this.lastSyncTimestamp
      };

    } finally {
      await redis.disconnect();
      this.isSyncing = false;
    }
  }

  async performIncrementalSync(): Promise<SyncResult> {
    const pool = connectDatabase();
    const redis = await connectRedis();

    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    let syncedRecords = 0;
    let conflicts = 0;

    try {
      this.fastify.log.info('Starting incremental laboratory data sync');

      const lastSync = this.lastSyncTimestamp || new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      // Sync modified lab orders
      const orderResult = await this.syncModifiedLabOrders(lastSync);
      syncedRecords += orderResult.syncedRecords;
      conflicts += orderResult.conflicts;

      // Sync modified lab results
      const resultSync = await this.syncModifiedLabResults(lastSync);
      syncedRecords += resultSync.syncedRecords;
      conflicts += resultSync.conflicts;

      // Sync modified critical value notifications
      const criticalResult = await this.syncModifiedCriticalValueNotifications(lastSync);
      syncedRecords += criticalResult.syncedRecords;
      conflicts += criticalResult.conflicts;

      // Sync modified specimen tracking
      const specimenResult = await this.syncModifiedSpecimenTracking(lastSync);
      syncedRecords += specimenResult.syncedRecords;
      conflicts += specimenResult.conflicts;

      // Sync modified QC results
      const qcResult = await this.syncModifiedLabQCResults(lastSync);
      syncedRecords += qcResult.syncedRecords;
      conflicts += qcResult.conflicts;

      // Sync modified result validations
      const validationResult = await this.syncModifiedResultValidations(lastSync);
      syncedRecords += validationResult.syncedRecords;
      conflicts += validationResult.conflicts;

      this.lastSyncTimestamp = new Date();
      await this.updateLastSyncTimestamp();

      // Update sync metadata in Redis
      await redis.set('lab_sync:last_incremental_sync', new Date().toISOString());

      this.fastify.log.info(`Incremental laboratory sync completed: ${syncedRecords} records synced, ${conflicts} conflicts`);

      return {
        syncedRecords,
        conflicts,
        lastSyncTimestamp: this.lastSyncTimestamp
      };

    } finally {
      await redis.disconnect();
      this.isSyncing = false;
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    const pool = connectDatabase();
    const redis = await connectRedis();

    try {
      // Get sync metadata from Redis
      const lastFullSyncStr = await redis.get('lab_sync:last_full_sync');
      const lastIncrementalSyncStr = await redis.get('lab_sync:last_incremental_sync');

      // Count pending conflicts
      const conflictResult = await pool.query(`
        SELECT COUNT(*) as count FROM sync_conflicts
        WHERE service_name = 'laboratory' AND status = 'pending'
      `);
      const pendingConflicts = parseInt(conflictResult.rows[0].count);

      // Count total records across all lab tables
      const tables = ['lab_orders', 'lab_results', 'critical_value_notifications',
                     'specimen_tracking', 'lab_qc_results', 'result_validations'];
      let totalRecords = 0;

      for (const table of tables) {
        try {
          const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
          totalRecords += parseInt(countResult.rows[0].count);
        } catch (error) {
          // Table might not exist yet, skip
          this.fastify.log.warn(`Table ${table} not found, skipping count`);
        }
      }

      return {
        lastFullSync: lastFullSyncStr ? new Date(lastFullSyncStr) : null,
        lastIncrementalSync: lastIncrementalSyncStr ? new Date(lastIncrementalSyncStr) : null,
        pendingConflicts,
        totalRecords,
        isHealthy: true // Could add health checks here
      };

    } finally {
      await redis.disconnect();
    }
  }

  private async syncLabOrders(): Promise<{ syncedRecords: number; conflicts: number }> {
    // Implementation for syncing lab orders
    this.fastify.log.info('Syncing lab orders');

    const pool = connectDatabase();
    let syncedRecords = 0;
    let conflicts = 0;

    try {
      // Get lab orders from main database that need syncing
      const lastSync = this.lastSyncTimestamp || new Date(0);
      const mainOrdersResult = await pool.query(`
        SELECT * FROM lab_orders
        WHERE updated_at > $1
      `, [lastSync]);

      for (const order of mainOrdersResult.rows) {
        try {
          // Check for conflicts and sync
          const conflict = await this.detectConflict('lab_order', order.id);
          if (conflict) {
            conflicts++;
            await this.recordConflict('lab_order', order.id, 'data_mismatch', order, conflict);
          } else {
            // Sync to microservice (would call microservice API)
            await this.syncToMicroservice('lab_order', order);
            syncedRecords++;
          }
        } catch (error) {
          this.fastify.log.error({ msg: 'Failed to sync lab order', orderId: order.id, error });
        }
      }

      return { syncedRecords, conflicts };
    } finally {
      // Pool doesn't need to be closed, it's managed by the connection
    }
  }

  private async syncLabResults(): Promise<{ syncedRecords: number; conflicts: number }> {
    // Implementation for syncing lab results
    this.fastify.log.info('Syncing lab results');

    const pool = connectDatabase();
    let syncedRecords = 0;
    let conflicts = 0;

    try {
      const lastSync = this.lastSyncTimestamp || new Date(0);
      const mainResultsResult = await pool.query(`
        SELECT * FROM lab_results
        WHERE updated_at > $1
      `, [lastSync]);

      for (const result of mainResultsResult.rows) {
        try {
          const conflict = await this.detectConflict('lab_result', result.id);
          if (conflict) {
            conflicts++;
            await this.recordConflict('lab_result', result.id, 'data_mismatch', result, conflict);
          } else {
            await this.syncToMicroservice('lab_result', result);
            syncedRecords++;
          }
        } catch (error) {
          this.fastify.log.error({ msg: 'Failed to sync lab result', resultId: result.id, error });
        }
      }

      return { syncedRecords, conflicts };
    } finally {
      // Pool doesn't need to be closed
    }
  }

  private async syncCriticalValueNotifications(): Promise<{ syncedRecords: number; conflicts: number }> {
    // Implementation for syncing critical value notifications
    this.fastify.log.info('Syncing critical value notifications');

    const pool = connectDatabase();
    let syncedRecords = 0;
    let conflicts = 0;

    try {
      const lastSync = this.lastSyncTimestamp || new Date(0);
      const mainNotificationsResult = await pool.query(`
        SELECT * FROM critical_value_notifications
        WHERE updated_at > $1
      `, [lastSync]);

      for (const notification of mainNotificationsResult.rows) {
        try {
          const conflict = await this.detectConflict('critical_notification', notification.id);
          if (conflict) {
            conflicts++;
            await this.recordConflict('critical_notification', notification.id, 'data_mismatch', notification, conflict);
          } else {
            await this.syncToMicroservice('critical_notification', notification);
            syncedRecords++;
          }
        } catch (error) {
          this.fastify.log.error({ msg: 'Failed to sync critical notification', notificationId: notification.id, error });
        }
      }

      return { syncedRecords, conflicts };
    } finally {
      // Pool doesn't need to be closed
    }
  }

  private async syncSpecimenTracking(): Promise<{ syncedRecords: number; conflicts: number }> {
    // Implementation for syncing specimen tracking
    this.fastify.log.info('Syncing specimen tracking');

    const pool = connectDatabase();
    let syncedRecords = 0;
    let conflicts = 0;

    try {
      const lastSync = this.lastSyncTimestamp || new Date(0);
      const mainSpecimensResult = await pool.query(`
        SELECT * FROM specimen_tracking
        WHERE updated_at > $1
      `, [lastSync]);

      for (const specimen of mainSpecimensResult.rows) {
        try {
          const conflict = await this.detectConflict('specimen_tracking', specimen.specimen_id);
          if (conflict) {
            conflicts++;
            await this.recordConflict('specimen_tracking', specimen.specimen_id, 'data_mismatch', specimen, conflict);
          } else {
            await this.syncToMicroservice('specimen_tracking', specimen);
            syncedRecords++;
          }
        } catch (error) {
          this.fastify.log.error({ msg: 'Failed to sync specimen', specimenId: specimen.specimen_id, error });
        }
      }

      return { syncedRecords, conflicts };
    } finally {
      // Pool doesn't need to be closed
    }
  }

  private async syncLabQCResults(): Promise<{ syncedRecords: number; conflicts: number }> {
    // Implementation for syncing QC results
    this.fastify.log.info('Syncing lab QC results');

    const pool = connectDatabase();
    let syncedRecords = 0;
    let conflicts = 0;

    try {
      const lastSync = this.lastSyncTimestamp || new Date(0);
      const mainQCResultsResult = await pool.query(`
        SELECT * FROM lab_qc_results
        WHERE updated_at > $1
      `, [lastSync]);

      for (const qcResult of mainQCResultsResult.rows) {
        try {
          const conflict = await this.detectConflict('qc_result', qcResult.id);
          if (conflict) {
            conflicts++;
            await this.recordConflict('qc_result', qcResult.id, 'data_mismatch', qcResult, conflict);
          } else {
            await this.syncToMicroservice('qc_result', qcResult);
            syncedRecords++;
          }
        } catch (error) {
          this.fastify.log.error({ msg: 'Failed to sync QC result', qcResultId: qcResult.id, error });
        }
      }

      return { syncedRecords, conflicts };
    } finally {
      // Pool doesn't need to be closed
    }
  }

  private async syncLabInstruments(): Promise<{ syncedRecords: number; conflicts: number }> {
    // Implementation for syncing lab instruments
    this.fastify.log.info('Syncing lab instruments');

    const pool = connectDatabase();
    let syncedRecords = 0;
    let conflicts = 0;

    try {
      const lastSync = this.lastSyncTimestamp || new Date(0);
      const mainInstrumentsResult = await pool.query(`
        SELECT * FROM lab_instruments
        WHERE updated_at > $1
      `, [lastSync]);

      for (const instrument of mainInstrumentsResult.rows) {
        try {
          const conflict = await this.detectConflict('lab_instrument', instrument.instrument_id);
          if (conflict) {
            conflicts++;
            await this.recordConflict('lab_instrument', instrument.instrument_id, 'data_mismatch', instrument, conflict);
          } else {
            await this.syncToMicroservice('lab_instrument', instrument);
            syncedRecords++;
          }
        } catch (error) {
          this.fastify.log.error({ msg: 'Failed to sync instrument', instrumentId: instrument.instrument_id, error });
        }
      }

      return { syncedRecords, conflicts };
    } finally {
      // Pool doesn't need to be closed
    }
  }

  private async syncResultValidations(): Promise<{ syncedRecords: number; conflicts: number }> {
    // Implementation for syncing result validations
    this.fastify.log.info('Syncing result validations');

    const pool = connectDatabase();
    let syncedRecords = 0;
    let conflicts = 0;

    try {
      const lastSync = this.lastSyncTimestamp || new Date(0);
      const mainValidationsResult = await pool.query(`
        SELECT * FROM result_validations
        WHERE updated_at > $1
      `, [lastSync]);

      for (const validation of mainValidationsResult.rows) {
        try {
          const conflict = await this.detectConflict('result_validation', validation.result_id);
          if (conflict) {
            conflicts++;
            await this.recordConflict('result_validation', validation.result_id, 'data_mismatch', validation, conflict);
          } else {
            await this.syncToMicroservice('result_validation', validation);
            syncedRecords++;
          }
        } catch (error) {
          this.fastify.log.error({ msg: 'Failed to sync validation', validationId: validation.result_id, error });
        }
      }

      return { syncedRecords, conflicts };
    } finally {
      // Pool doesn't need to be closed
    }
  }

  // Incremental sync methods
  private async syncModifiedLabOrders(since: Date): Promise<{ syncedRecords: number; conflicts: number }> {
    this.fastify.log.info(`Syncing modified lab orders since ${since.toISOString()}`);
    return this.syncLabOrders(); // Reuse full sync logic with timestamp filtering
  }

  private async syncModifiedLabResults(since: Date): Promise<{ syncedRecords: number; conflicts: number }> {
    this.fastify.log.info(`Syncing modified lab results since ${since.toISOString()}`);
    return this.syncLabResults();
  }

  private async syncModifiedCriticalValueNotifications(since: Date): Promise<{ syncedRecords: number; conflicts: number }> {
    this.fastify.log.info(`Syncing modified critical value notifications since ${since.toISOString()}`);
    return this.syncCriticalValueNotifications();
  }

  private async syncModifiedSpecimenTracking(since: Date): Promise<{ syncedRecords: number; conflicts: number }> {
    this.fastify.log.info(`Syncing modified specimen tracking since ${since.toISOString()}`);
    return this.syncSpecimenTracking();
  }

  private async syncModifiedLabQCResults(since: Date): Promise<{ syncedRecords: number; conflicts: number }> {
    this.fastify.log.info(`Syncing modified lab QC results since ${since.toISOString()}`);
    return this.syncLabQCResults();
  }

  private async syncModifiedResultValidations(since: Date): Promise<{ syncedRecords: number; conflicts: number }> {
    this.fastify.log.info(`Syncing modified result validations since ${since.toISOString()}`);
    return this.syncResultValidations();
  }

  // Helper methods for conflict detection and syncing
  private async detectConflict(entityType: string, entityId: string): Promise<any> {
    // This would check the microservice for existing data
    // For now, return null (no conflict)
    return null;
  }

  private async recordConflict(entityType: string, entityId: string, conflictType: string, mainData: any, microData: any): Promise<void> {
    const pool = connectDatabase();

    try {
      await pool.query(`
        INSERT INTO sync_conflicts (
          entity_id, entity_type, service_name, conflict_type,
          main_data, microservice_data, detected_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        entityId,
        entityType,
        'laboratory',
        conflictType,
        JSON.stringify(mainData),
        JSON.stringify(microData),
        new Date(),
        'pending'
      ]);
    } finally {
      // Pool doesn't need to be closed
    }
  }

  private async syncToMicroservice(entityType: string, data: any): Promise<void> {
    // This would make an HTTP call to the microservice to sync the data
    // For now, just log the sync
    this.fastify.log.info({
      msg: 'Syncing to microservice',
      entityType,
      entityId: data.id || data.specimen_id || data.instrument_id
    });
  }

  // Methods called by KafkaEventListener
  async handleIncomingUpdate(entityType: string, data: any): Promise<void> {
    this.fastify.log.info({
      msg: 'Handling incoming update from microservice',
      entityType,
      entityId: data.id
    });

    // Validate and sync the incoming data
    // This would typically update the main database
  }

  async handleIncomingDeletion(entityType: string, entityId: string): Promise<void> {
    this.fastify.log.info({
      msg: 'Handling incoming deletion from microservice',
      entityType,
      entityId
    });

    // Handle deletion sync
    // This would typically mark records as deleted in the main database
  }

  async shutdown(): Promise<void> {
    // Cleanup resources
    this.isSyncing = false;
    this.fastify.log.info('Laboratory sync service shut down');
  }

  private async updateLastSyncTimestamp(): Promise<void> {
    const redis = await connectRedis();
    try {
      await redis.set('lab_sync:last_sync_timestamp', this.lastSyncTimestamp!.toISOString());
    } finally {
      await redis.disconnect();
    }
  }
}