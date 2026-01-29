import { FastifyInstance } from 'fastify';
import { Kafka, Consumer, Producer } from 'kafkajs';
import { Appointment } from '../types/appointment';
import { AppointmentSyncService } from './AppointmentSyncService';

interface AppointmentEvent {
  eventType: 'created' | 'updated' | 'deleted';
  appointmentId: string;
  data?: Appointment;
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
    private syncService: AppointmentSyncService,
    kafkaConfig: { brokers: string[]; clientId: string }
  ) {
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
    });

    this.consumer = this.kafka.consumer({ groupId: 'appointment-service-sync' });
    this.producer = this.kafka.producer();
  }

  async start(): Promise<void> {
    try {
      await this.consumer.connect();
      await this.producer.connect();

      // Subscribe to appointment events
      await this.consumer.subscribe({
        topic: 'appointment-events',
        fromBeginning: false
      });

      // Subscribe to sync commands
      await this.consumer.subscribe({
        topic: 'appointment-sync-commands',
        fromBeginning: false
      });

      this.isRunning = true;

      this.fastify.log.info('Kafka event listener started');

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
      this.fastify.log.info('Kafka event listener stopped');
    } catch (error) {
      this.fastify.log.error({ msg: 'Error stopping Kafka event listener', error });
    }
  }

  private async handleMessage(topic: string, eventData: any): Promise<void> {
    switch (topic) {
      case 'appointment-events':
        await this.handleAppointmentEvent(eventData);
        break;
      case 'appointment-sync-commands':
        await this.handleSyncCommand(eventData);
        break;
      default:
        this.fastify.log.warn(`Unknown topic: ${topic}`);
    }
  }

  private async handleAppointmentEvent(event: AppointmentEvent): Promise<void> {
    try {
      this.fastify.log.info({
        msg: 'Processing appointment event',
        eventType: event.eventType,
        appointmentId: event.appointmentId
      });

      switch (event.eventType) {
        case 'created':
        case 'updated':
          if (event.data) {
            await this.syncService.handleIncomingUpdate(event.data);
          }
          break;
        case 'deleted':
          await this.syncService.handleIncomingDeletion(event.appointmentId);
          break;
        default:
          this.fastify.log.warn(`Unknown event type: ${event.eventType}`);
      }

      // Send acknowledgment
      await this.sendAcknowledgment(event);

    } catch (error) {
      this.fastify.log.error({
        msg: 'Failed to handle appointment event',
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
        msg: 'Processing sync command',
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

  private async sendAcknowledgment(event: AppointmentEvent): Promise<void> {
    try {
      await this.producer.send({
        topic: 'appointment-sync-acknowledgments',
        messages: [{
          key: event.appointmentId,
          value: JSON.stringify({
            originalEvent: event,
            acknowledgedAt: new Date(),
            service: 'appointment-service'
          })
        }]
      });
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to send acknowledgment', error });
    }
  }

  private async sendErrorNotification(event: AppointmentEvent, error: any): Promise<void> {
    try {
      await this.producer.send({
        topic: 'appointment-sync-errors',
        messages: [{
          key: event.appointmentId,
          value: JSON.stringify({
            originalEvent: event,
            error: error.message,
            errorAt: new Date(),
            service: 'appointment-service'
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
        topic: 'appointment-sync-results',
        messages: [{
          key: `sync_${Date.now()}`,
          value: JSON.stringify({
            syncType,
            result,
            completedAt: new Date(),
            service: 'appointment-service'
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
        topic: 'appointment-service-health',
        messages: [{
          key: 'health_status',
          value: JSON.stringify({
            status,
            timestamp: new Date(),
            service: 'appointment-service'
          })
        }]
      });
    } catch (error) {
      this.fastify.log.error({ msg: 'Failed to send health status', error });
    }
  }

  // Method to publish appointment events from the microservice
  async publishAppointmentEvent(event: AppointmentEvent): Promise<void> {
    try {
      await this.producer.send({
        topic: 'appointment-microservice-events',
        messages: [{
          key: event.appointmentId,
          value: JSON.stringify(event)
        }]
      });

      this.fastify.log.info({
        msg: 'Published appointment event',
        eventType: event.eventType,
        appointmentId: event.appointmentId
      });

    } catch (error) {
      this.fastify.log.error({
        msg: 'Failed to publish appointment event',
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