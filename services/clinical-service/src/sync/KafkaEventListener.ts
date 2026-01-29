import { FastifyInstance } from 'fastify';
import { Kafka, Consumer, Producer } from 'kafkajs';
import { ClinicalSyncService } from './ClinicalSyncService';

interface ClinicalEvent {
  eventType: 'created' | 'updated' | 'deleted';
  recordType: 'consultation' | 'clinical_workflow' | 'medical_record' | 'clinical_decision_support';
  recordId: string;
  data?: any;
  timestamp: Date;
  source: string;
}

export class KafkaEventListener {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private isRunning = false;

  constructor(
    private fastify: FastifyInstance,
    private syncService: ClinicalSyncService,
    kafkaConfig: { brokers: string[]; clientId: string }
  ) {
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
    });

    this.consumer = this.kafka.consumer({ groupId: 'clinical-service-sync' });
    this.producer = this.kafka.producer();
  }

  async start(): Promise<void> {
    try {
      await this.consumer.connect();
      await this.producer.connect();

      // Subscribe to clinical events
      await this.consumer.subscribe({
        topic: 'clinical-events',
        fromBeginning: false
      });

      // Subscribe to sync commands
      await this.consumer.subscribe({
        topic: 'clinical-sync-commands',
        fromBeginning: false
      });

      this.isRunning = true;

      this.fastify.log.info('Clinical Kafka event listener started');

      // Start consuming messages
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const eventData = JSON.parse(message.value!.toString());
            await this.handleMessage(topic, eventData);
          } catch (error) {
            this.fastify.log.error({ msg: 'Failed to process clinical Kafka message', error });
          }
        },
      });

    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to start clinical Kafka event listener', error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;

    try {
      await this.consumer.disconnect();
      await this.producer.disconnect();
      this.fastify.log.info('Clinical Kafka event listener stopped');
    } catch (error) {
      this.fastify.log.error({ msg: 'Error stopping clinical Kafka event listener', error });
    }
  }

  private async handleMessage(topic: string, eventData: any): Promise<void> {
    switch (topic) {
      case 'clinical-events':
        await this.handleClinicalEvent(eventData);
        break;
      case 'clinical-sync-commands':
        await this.handleSyncCommand(eventData);
        break;
      default:
        this.fastify.log.warn(`Unknown clinical topic: ${topic}`);
    }
  }

  private async handleClinicalEvent(event: ClinicalEvent): Promise<void> {
    try {
      this.fastify.log.info({
        msg: 'Processing clinical event',
        eventType: event.eventType,
        recordType: event.recordType,
        recordId: event.recordId
      });

      switch (event.eventType) {
        case 'created':
        case 'updated':
          if (event.data) {
            await this.syncService.handleIncomingUpdate(event.recordType, event.data);
          }
          break;
        case 'deleted':
          await this.syncService.handleIncomingDeletion(event.recordType, event.recordId);
          break;
        default:
          this.fastify.log.warn(`Unknown clinical event type: ${event.eventType}`);
      }

      // Send acknowledgment
      await this.sendAcknowledgment(event);

    } catch (error) {
      this.fastify.log.error({
        msg: 'Failed to handle clinical event',
        event,
        error
      });

      // Send error notification
      await this.sendErrorNotification(event, error);
    }
  }

  private async handleSyncCommand(command: any): Promise<void> {
    try {
      this.fastify.log.info({
        msg: 'Processing clinical sync command',
        commandType: command.type
      });

      switch (command.type) {
        case 'full_sync':
          const result = await this.syncService.performFullSync();
          await this.sendSyncResult('full_sync', result);
          break;
        case 'incremental_sync':
          const incrementalResult = await this.syncService.performIncrementalSync();
          await this.sendSyncResult('incremental_sync', incrementalResult);
          break;
        case 'health_check':
          const status = await this.syncService.getSyncStatus();
          await this.sendHealthStatus(status);
          break;
        default:
          this.fastify.log.warn(`Unknown clinical sync command: ${command.type}`);
      }

    } catch (error) {
      this.fastify.log.error({
        msg: 'Failed to handle clinical sync command',
        command,
        error
      });
    }
  }

  private async sendAcknowledgment(event: ClinicalEvent): Promise<void> {
    try {
      await this.producer.send({
        topic: 'clinical-sync-acknowledgments',
        messages: [{
          key: `${event.recordType}_${event.recordId}`,
          value: JSON.stringify({
            originalEvent: event,
            acknowledgedAt: new Date(),
            service: 'clinical-service'
          })
        }]
      });
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to send clinical acknowledgment', error });
    }
  }

  private async sendErrorNotification(event: ClinicalEvent, error: any): Promise<void> {
    try {
      await this.producer.send({
        topic: 'clinical-sync-errors',
        messages: [{
          key: `${event.recordType}_${event.recordId}`,
          value: JSON.stringify({
            originalEvent: event,
            error: error.message,
            errorAt: new Date(),
            service: 'clinical-service'
          })
        }]
      });
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to send clinical error notification', error });
    }
  }

  private async sendSyncResult(syncType: string, result: any): Promise<void> {
    try {
      await this.producer.send({
        topic: 'clinical-sync-results',
        messages: [{
          key: `sync_${Date.now()}`,
          value: JSON.stringify({
            syncType,
            result,
            completedAt: new Date(),
            service: 'clinical-service'
          })
        }]
      });
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to send clinical sync result', error });
    }
  }

  private async sendHealthStatus(status: any): Promise<void> {
    try {
      await this.producer.send({
        topic: 'clinical-service-health',
        messages: [{
          key: 'health_status',
          value: JSON.stringify({
            status,
            timestamp: new Date(),
            service: 'clinical-service'
          })
        }]
      });
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to send clinical health status', error });
    }
  }

  // Method to publish clinical events from the microservice
  async publishClinicalEvent(event: ClinicalEvent): Promise<void> {
    try {
      await this.producer.send({
        topic: 'clinical-microservice-events',
        messages: [{
          key: `${event.recordType}_${event.recordId}`,
          value: JSON.stringify(event)
        }]
      });

      this.fastify.log.info({
        msg: 'Published clinical event',
        eventType: event.eventType,
        recordType: event.recordType,
        recordId: event.recordId
      });

    } catch (error) {
      this.fastify.log.error({
        msg: 'Failed to publish clinical event',
        event,
        error
      });
      throw error;
    }
  }

  getStatus(): { isRunning: boolean } {
    return { isRunning: this.isRunning };
  }
}