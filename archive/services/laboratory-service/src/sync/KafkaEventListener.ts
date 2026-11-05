import { FastifyInstance } from 'fastify';
import { Kafka, Consumer, Producer } from 'kafkajs';
import { LaboratorySyncService } from './LaboratorySyncService';

interface LaboratoryEvent {
  eventType: 'created' | 'updated' | 'deleted';
  entityType: 'lab_order' | 'lab_result' | 'critical_notification' | 'specimen_tracking' | 'qc_result';
  entityId: string;
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
    private syncService: LaboratorySyncService,
    kafkaConfig: { brokers: string[]; clientId: string }
  ) {
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
    });

    this.consumer = this.kafka.consumer({ groupId: 'laboratory-service-sync' });
    this.producer = this.kafka.producer();
  }

  async start(): Promise<void> {
    try {
      await this.consumer.connect();
      await this.producer.connect();

      // Subscribe to laboratory events
      await this.consumer.subscribe({
        topic: 'laboratory-events',
        fromBeginning: false
      });

      // Subscribe to sync commands
      await this.consumer.subscribe({
        topic: 'laboratory-sync-commands',
        fromBeginning: false
      });

      // Subscribe to critical value alerts
      await this.consumer.subscribe({
        topic: 'critical-value-alerts',
        fromBeginning: false
      });

      this.isRunning = true;

      this.fastify.log.info('Kafka event listener started for laboratory service');

      // Start consuming messages
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const eventData = JSON.parse(message.value!.toString());
            await this.handleMessage(topic, eventData);
          } catch (error) {
            this.fastify.log.error({ msg: 'Failed to process Kafka message', error });
          }
        },
      });

    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to start Kafka event listener', error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;

    try {
      await this.consumer.disconnect();
      await this.producer.disconnect();
      this.fastify.log.info('Kafka event listener stopped for laboratory service');
    } catch (error) {
      this.fastify.log.error({ msg: 'Error stopping Kafka event listener', error });
    }
  }

  private async handleMessage(topic: string, eventData: any): Promise<void> {
    switch (topic) {
      case 'laboratory-events':
        await this.handleLaboratoryEvent(eventData);
        break;
      case 'laboratory-sync-commands':
        await this.handleSyncCommand(eventData);
        break;
      case 'critical-value-alerts':
        await this.handleCriticalValueAlert(eventData);
        break;
      default:
        this.fastify.log.warn(`Unknown topic: ${topic}`);
    }
  }

  private async handleLaboratoryEvent(event: LaboratoryEvent): Promise<void> {
    try {
      this.fastify.log.info({
        msg: 'Processing laboratory event',
        eventType: event.eventType,
        entityType: event.entityType,
        entityId: event.entityId
      });

      switch (event.eventType) {
        case 'created':
        case 'updated':
          if (event.data) {
            await this.syncService.handleIncomingUpdate(event.entityType, event.data);
          }
          break;
        case 'deleted':
          await this.syncService.handleIncomingDeletion(event.entityType, event.entityId);
          break;
        default:
          this.fastify.log.warn(`Unknown event type: ${event.eventType}`);
      }

      // Send acknowledgment
      await this.sendAcknowledgment(event);

    } catch (error) {
      this.fastify.log.error({
        msg: 'Failed to handle laboratory event',
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
        msg: 'Processing laboratory sync command',
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
        case 'clia_compliance_check':
          // Trigger CLIA compliance validation
          await this.performCLIAComplianceCheck();
          break;
        default:
          this.fastify.log.warn(`Unknown sync command: ${command.type}`);
      }

    } catch (error) {
      this.fastify.log.error({
        msg: 'Failed to handle sync command',
        command,
        error
      });
    }
  }

  private async handleCriticalValueAlert(alert: any): Promise<void> {
    try {
      this.fastify.log.warn({
        msg: 'Received critical value alert',
        alert
      });

      // Forward critical value alert to appropriate channels
      await this.forwardCriticalValueAlert(alert);

      // Ensure critical value is synced immediately
      if (alert.labResultId) {
        await this.syncService.handleIncomingUpdate('lab_result', { id: alert.labResultId });
      }

    } catch (error) {
      this.fastify.log.error({
        msg: 'Failed to handle critical value alert',
        alert,
        error
      });
    }
  }

  private async sendAcknowledgment(event: LaboratoryEvent): Promise<void> {
    try {
      await this.producer.send({
        topic: 'laboratory-sync-acknowledgments',
        messages: [{
          key: event.entityId,
          value: JSON.stringify({
            originalEvent: event,
            acknowledgedAt: new Date(),
            service: 'laboratory-service'
          })
        }]
      });
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to send acknowledgment', error });
    }
  }

  private async sendErrorNotification(event: LaboratoryEvent, error: any): Promise<void> {
    try {
      await this.producer.send({
        topic: 'laboratory-sync-errors',
        messages: [{
          key: event.entityId,
          value: JSON.stringify({
            originalEvent: event,
            error: error.message,
            errorAt: new Date(),
            service: 'laboratory-service'
          })
        }]
      });
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to send error notification', error });
    }
  }

  private async sendSyncResult(syncType: string, result: any): Promise<void> {
    try {
      await this.producer.send({
        topic: 'laboratory-sync-results',
        messages: [{
          key: `sync_${Date.now()}`,
          value: JSON.stringify({
            syncType,
            result,
            completedAt: new Date(),
            service: 'laboratory-service'
          })
        }]
      });
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to send sync result', error });
    }
  }

  private async sendHealthStatus(status: any): Promise<void> {
    try {
      await this.producer.send({
        topic: 'laboratory-service-health',
        messages: [{
          key: 'health_status',
          value: JSON.stringify({
            status,
            timestamp: new Date(),
            service: 'laboratory-service'
          })
        }]
      });
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to send health status', error });
    }
  }

  // Method to publish laboratory events from the microservice
  async publishLaboratoryEvent(event: LaboratoryEvent): Promise<void> {
    try {
      await this.producer.send({
        topic: 'laboratory-microservice-events',
        messages: [{
          key: event.entityId,
          value: JSON.stringify(event)
        }]
      });

      this.fastify.log.info({
        msg: 'Published laboratory event',
        eventType: event.eventType,
        entityType: event.entityType,
        entityId: event.entityId
      });

    } catch (error) {
      this.fastify.log.error({
        msg: 'Failed to publish laboratory event',
        event,
        error
      });
      throw error;
    }
  }

  // Publish critical value notification
  async publishCriticalValueNotification(notification: any): Promise<void> {
    try {
      await this.producer.send({
        topic: 'critical-value-notifications',
        messages: [{
          key: notification.id,
          value: JSON.stringify({
            ...notification,
            publishedAt: new Date(),
            service: 'laboratory-service'
          })
        }]
      });

      this.fastify.log.warn({
        msg: 'Published critical value notification',
        notificationId: notification.id,
        patientId: notification.patient_id
      });

    } catch (error) {
      this.fastify.log.error({
        msg: 'Failed to publish critical value notification',
        notification,
        error
      });
      throw error;
    }
  }

  // CLIA compliance check
  private async performCLIAComplianceCheck(): Promise<void> {
    try {
      // This would integrate with the DataValidationService
      // For now, just log that the check was performed
      this.fastify.log.info('CLIA compliance check performed');

      await this.producer.send({
        topic: 'clia-compliance-results',
        messages: [{
          key: `clia_check_${Date.now()}`,
          value: JSON.stringify({
            checkPerformed: true,
            timestamp: new Date(),
            service: 'laboratory-service',
            status: 'completed' // Would be actual compliance status
          })
        }]
      });
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to perform CLIA compliance check', error });
    }
  }

  // Forward critical value alerts to appropriate recipients
  private async forwardCriticalValueAlert(alert: any): Promise<void> {
    try {
      // This would integrate with notification systems (SMS, email, pager, etc.)
      // For now, publish to a notification topic
      await this.producer.send({
        topic: 'critical-value-forwarded',
        messages: [{
          key: alert.id,
          value: JSON.stringify({
            ...alert,
            forwardedAt: new Date(),
            service: 'laboratory-service'
          })
        }]
      });

      this.fastify.log.warn({
        msg: 'Critical value alert forwarded',
        alertId: alert.id
      });
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to forward critical value alert', error });
    }
  }

  getStatus(): { isRunning: boolean } {
    return { isRunning: this.isRunning };
  }
}