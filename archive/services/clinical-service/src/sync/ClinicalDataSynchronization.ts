import { FastifyInstance } from 'fastify';
import { ClinicalSyncService } from './ClinicalSyncService';
import { ConflictResolutionService } from './ConflictResolutionService';
import { DataValidationService } from './DataValidationService';
import { KafkaEventListener } from './KafkaEventListener';

export class ClinicalDataSynchronization {
  private syncService: ClinicalSyncService;
  private conflictResolution: ConflictResolutionService;
  private dataValidation: DataValidationService;
  private kafkaListener: KafkaEventListener;

  constructor(private fastify: FastifyInstance) {
    this.syncService = new ClinicalSyncService(fastify);
    this.conflictResolution = new ConflictResolutionService(fastify);
    this.dataValidation = new DataValidationService(fastify);

    // Initialize Kafka event listener with configuration
    this.kafkaListener = new KafkaEventListener(
      fastify,
      this.syncService,
      {
        brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
        clientId: 'clinical-service'
      }
    );
  }

  async initialize(): Promise<void> {
    await this.setupRoutes();
    await this.startBackgroundSync();
    await this.kafkaListener.start();
    this.fastify.log.info('Clinical data synchronization initialized');
  }

  private async setupRoutes(): Promise<void> {
    const fastify = this.fastify;

    // Manual sync endpoint
    fastify.post('/api/clinical/sync', async (request, reply) => {
      try {
        const result = await this.syncService.performFullSync();
        return reply.send({
          success: true,
          syncedRecords: result.syncedRecords,
          conflicts: result.conflicts,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        fastify.log.error({ msg: 'Manual sync failed', error });
        return reply.status(500).send({
          success: false,
          error: 'Sync failed',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Sync status endpoint
    fastify.get('/api/clinical/sync/status', async (request, reply) => {
      try {
        const status = await this.syncService.getSyncStatus();
        return reply.send(status);
      } catch (error) {
        fastify.log.error({ msg: 'Sync status check failed', error });
        return reply.status(500).send({
          error: 'Status check failed',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Conflict resolution endpoint
    fastify.post('/api/clinical/sync/conflicts/:conflictId/resolve', async (request, reply) => {
      try {
        const { conflictId } = request.params as { conflictId: string };
        const { strategy } = request.body as {
          strategy: string;
        };

        await this.conflictResolution.resolveConflict(conflictId, strategy);

        return reply.send({
          success: true,
          conflictId,
          resolution: strategy,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        fastify.log.error({ msg: 'Conflict resolution failed', error });
        return reply.status(500).send({
          success: false,
          error: 'Conflict resolution failed',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Get pending conflicts
    fastify.get('/api/clinical/sync/conflicts', async (request, reply) => {
      try {
        const conflicts = await this.conflictResolution.getPendingConflicts();
        return reply.send({
          conflicts,
          count: conflicts.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        fastify.log.error({ msg: 'Get conflicts failed', error });
        return reply.status(500).send({
          error: 'Failed to get conflicts',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Data validation endpoint
    fastify.post('/api/clinical/sync/validate', async (request, reply) => {
      try {
        const { records } = request.body as { records: any[] };
        const validationResult = await this.dataValidation.validateBatchClinicalRecords(records);

        return reply.send({
          success: true,
          validation: validationResult,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        fastify.log.error({ msg: 'Data validation failed', error });
        return reply.status(500).send({
          success: false,
          error: 'Data validation failed',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Data quality metrics endpoint
    fastify.get('/api/clinical/sync/quality', async (request, reply) => {
      try {
        const metrics = await this.dataValidation.getDataQualityMetrics();
        return reply.send(metrics);
      } catch (error) {
        fastify.log.error({ msg: 'Data quality check failed', error });
        return reply.status(500).send({
          error: 'Data quality check failed',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Quarantined data management
    fastify.get('/api/clinical/sync/quarantine', async (request, reply) => {
      try {
        const quarantined = await this.dataValidation.getQuarantinedData();
        return reply.send({
          quarantined,
          count: quarantined.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        fastify.log.error({ msg: 'Get quarantined data failed', error });
        return reply.status(500).send({
          error: 'Failed to get quarantined data',
          timestamp: new Date().toISOString()
        });
      }
    });

    fastify.post('/api/clinical/sync/quarantine/:quarantineId/approve', async (request, reply) => {
      try {
        const { quarantineId } = request.params as { quarantineId: string };
        const { approvedBy } = request.body as { approvedBy: string };

        await this.dataValidation.approveQuarantinedData(quarantineId, approvedBy);

        return reply.send({
          success: true,
          quarantineId,
          action: 'approved',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        fastify.log.error({ msg: 'Approve quarantined data failed', error });
        return reply.status(500).send({
          success: false,
          error: 'Failed to approve quarantined data',
          timestamp: new Date().toISOString()
        });
      }
    });

    fastify.post('/api/clinical/sync/quarantine/:quarantineId/reject', async (request, reply) => {
      try {
        const { quarantineId } = request.params as { quarantineId: string };
        const { rejectedBy, reason } = request.body as { rejectedBy: string; reason: string };

        await this.dataValidation.rejectQuarantinedData(quarantineId, rejectedBy, reason);

        return reply.send({
          success: true,
          quarantineId,
          action: 'rejected',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        fastify.log.error({ msg: 'Reject quarantined data failed', error });
        return reply.status(500).send({
          success: false,
          error: 'Failed to reject quarantined data',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Conflict statistics endpoint
    fastify.get('/api/clinical/sync/conflicts/stats', async (request, reply) => {
      try {
        const stats = await this.conflictResolution.getConflictStatistics();
        return reply.send(stats);
      } catch (error) {
        fastify.log.error({ msg: 'Get conflict statistics failed', error });
        return reply.status(500).send({
          error: 'Failed to get conflict statistics',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Auto-resolve conflicts endpoint
    fastify.post('/api/clinical/sync/conflicts/auto-resolve', async (request, reply) => {
      try {
        const result = await this.conflictResolution.autoResolveConflicts();
        return reply.send({
          success: true,
          resolved: result.resolved,
          failed: result.failed,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        fastify.log.error({ msg: 'Auto-resolve conflicts failed', error });
        return reply.status(500).send({
          success: false,
          error: 'Auto-resolve conflicts failed',
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  private async startBackgroundSync(): Promise<void> {
    // Background sync every 5 minutes
    setInterval(async () => {
      try {
        await this.syncService.performIncrementalSync();
        this.fastify.log.info('Background clinical sync completed');
      } catch (error) {
        this.fastify.log.error({ msg: 'Background clinical sync failed', error });
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Real-time sync via Kafka events
    await this.setupEventListeners();
  }

  private async setupEventListeners(): Promise<void> {
    // Kafka event listeners are now handled by KafkaEventListener class
    this.fastify.log.info('Event listeners setup completed via Kafka');
  }

  async shutdown(): Promise<void> {
    await this.syncService.shutdown();
    await this.kafkaListener.stop();
    this.fastify.log.info('Clinical data synchronization shut down');
  }
}