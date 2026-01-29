import { FastifyInstance } from 'fastify';
import { PharmacySyncService } from './PharmacySyncService';
import { ConflictResolutionService } from './ConflictResolutionService';
import { DataValidationService } from './DataValidationService';
import { KafkaEventListener } from './KafkaEventListener';
import { logger } from '../utils/logger';

export class PharmacyDataSynchronization {
  private syncService: PharmacySyncService;
  private conflictResolution: ConflictResolutionService;
  private dataValidation: DataValidationService;
  private kafkaListener: KafkaEventListener;

  constructor() {
    this.syncService = new PharmacySyncService();
    this.conflictResolution = new ConflictResolutionService();
    this.dataValidation = new DataValidationService();
    this.kafkaListener = new KafkaEventListener();
  }

  async initialize(): Promise<void> {
    try {
      await this.kafkaListener.initialize();
      logger.info('Pharmacy data synchronization initialized');
    } catch (error) {
      logger.error('Failed to initialize pharmacy data synchronization', { error });
      throw error;
    }
  }

  async registerRoutes(app: FastifyInstance): Promise<void> {
    // Full sync endpoints
    app.post('/api/pharmacy/sync/full', async (request, reply) => {
      try {
        const result = await this.syncService.performFullSync();
        reply.send({ success: true, data: result });
      } catch (error) {
        logger.error('Full sync failed', { error });
        reply.code(500).send({ error: 'Full sync failed' });
      }
    });

    // Incremental sync endpoints
    app.post('/api/pharmacy/sync/incremental', async (request, reply) => {
      try {
        const result = await this.syncService.performIncrementalSync();
        reply.send({ success: true, data: result });
      } catch (error) {
        logger.error('Incremental sync failed', { error });
        reply.code(500).send({ error: 'Incremental sync failed' });
      }
    });

    // Conflict resolution endpoints
    app.get('/api/pharmacy/sync/conflicts', async (request, reply) => {
      try {
        const conflicts = await this.conflictResolution.getPendingConflicts();
        reply.send({ success: true, data: conflicts });
      } catch (error) {
        logger.error('Failed to get conflicts', { error });
        reply.code(500).send({ error: 'Failed to get conflicts' });
      }
    });

    app.post('/api/pharmacy/sync/conflicts/:id/resolve', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { strategy, manualData } = request.body as {
          strategy: 'main_wins' | 'microservice_wins' | 'merge' | 'manual';
          manualData?: any;
        };

        const result = await this.conflictResolution.resolveConflict(id, strategy, manualData);
        reply.send({ success: true, data: result });
      } catch (error) {
        logger.error('Failed to resolve conflict', { error });
        reply.code(500).send({ error: 'Failed to resolve conflict' });
      }
    });

    // Data validation endpoints
    app.post('/api/pharmacy/sync/validate', async (request, reply) => {
      try {
        const { data, type } = request.body as { data: any; type: string };
        const result = await this.dataValidation.validateData(data, type);
        reply.send({ success: true, data: result });
      } catch (error) {
        logger.error('Data validation failed', { error });
        reply.code(500).send({ error: 'Data validation failed' });
      }
    });

    // Quarantine management endpoints
    app.get('/api/pharmacy/sync/quarantine', async (request, reply) => {
      try {
        const quarantined = await this.dataValidation.getQuarantinedData();
        reply.send({ success: true, data: quarantined });
      } catch (error) {
        logger.error('Failed to get quarantined data', { error });
        reply.code(500).send({ error: 'Failed to get quarantined data' });
      }
    });

    app.post('/api/pharmacy/sync/quarantine/:id/review', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const { action, correctedData } = request.body as {
          action: 'approve' | 'reject' | 'correct';
          correctedData?: any;
        };

        const result = await this.dataValidation.reviewQuarantinedData(id, action, correctedData);
        reply.send({ success: true, data: result });
      } catch (error) {
        logger.error('Failed to review quarantined data', { error });
        reply.code(500).send({ error: 'Failed to review quarantined data' });
      }
    });

    // Sync status endpoints
    app.get('/api/pharmacy/sync/status', async (request, reply) => {
      try {
        const status = await this.syncService.getSyncStatus();
        reply.send({ success: true, data: status });
      } catch (error) {
        logger.error('Failed to get sync status', { error });
        reply.code(500).send({ error: 'Failed to get sync status' });
      }
    });

    // Manual sync trigger for specific entities
    app.post('/api/pharmacy/sync/entity/:type', async (request, reply) => {
      try {
        const { type } = request.params as { type: string };
        const { ids } = request.body as { ids: string[] };

        const result = await this.syncService.syncSpecificEntities(type, ids);
        reply.send({ success: true, data: result });
      } catch (error) {
        logger.error('Failed to sync specific entities', { error });
        reply.code(500).send({ error: 'Failed to sync specific entities' });
      }
    });
  }

  async shutdown(): Promise<void> {
    try {
      await this.kafkaListener.disconnect();
      logger.info('Pharmacy data synchronization shut down');
    } catch (error) {
      logger.error('Failed to shutdown pharmacy data synchronization', { error });
    }
  }
}