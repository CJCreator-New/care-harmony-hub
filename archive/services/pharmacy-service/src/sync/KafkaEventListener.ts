import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
import { PharmacySyncService } from './PharmacySyncService';
import { logger } from '../utils/logger';

interface KafkaConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
  topics: {
    prescriptionUpdates: string;
    medicationUpdates: string;
    inventoryUpdates: string;
    orderUpdates: string;
    syncCommands: string;
  };
}

export class KafkaEventListener {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private syncService: PharmacySyncService;
  private config: KafkaConfig;
  private isRunning: boolean = false;

  constructor() {
    this.config = {
      brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
      clientId: 'pharmacy-service-sync',
      groupId: 'pharmacy-sync-group',
      topics: {
        prescriptionUpdates: 'pharmacy.prescription.updates',
        medicationUpdates: 'pharmacy.medication.updates',
        inventoryUpdates: 'pharmacy.inventory.updates',
        orderUpdates: 'pharmacy.order.updates',
        syncCommands: 'pharmacy.sync.commands'
      }
    };

    this.kafka = new Kafka({
      clientId: this.config.clientId,
      brokers: this.config.brokers,
    });

    this.consumer = this.kafka.consumer({ groupId: this.config.groupId });
    this.producer = this.kafka.producer();
    this.syncService = new PharmacySyncService();
  }

  async initialize(): Promise<void> {
    try {
      await this.producer.connect();
      await this.consumer.connect();

      // Subscribe to topics
      await this.consumer.subscribe({
        topics: [
          this.config.topics.prescriptionUpdates,
          this.config.topics.medicationUpdates,
          this.config.topics.inventoryUpdates,
          this.config.topics.orderUpdates,
          this.config.topics.syncCommands
        ],
        fromBeginning: false
      });

      // Start consuming messages
      await this.consumer.run({
        eachMessage: this.handleMessage.bind(this),
      });

      this.isRunning = true;
      logger.info('Kafka event listener initialized for pharmacy service');
    } catch (error) {
      logger.error('Failed to initialize Kafka event listener', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.isRunning = false;
      await this.consumer.disconnect();
      await this.producer.disconnect();
      logger.info('Kafka event listener disconnected');
    } catch (error) {
      logger.error('Failed to disconnect Kafka event listener', { error });
    }
  }

  private async handleMessage({ topic, partition, message }: EachMessagePayload): Promise<void> {
    try {
      const messageValue = message.value?.toString();
      if (!messageValue) {
        logger.warn('Received empty message', { topic, partition });
        return;
      }

      const event = JSON.parse(messageValue);
      const key = message.key?.toString();

      logger.info('Received Kafka message', {
        topic,
        partition,
        key,
        eventType: event.type,
        recordId: event.recordId
      });

      switch (topic) {
        case this.config.topics.prescriptionUpdates:
          await this.handlePrescriptionUpdate(event);
          break;
        case this.config.topics.medicationUpdates:
          await this.handleMedicationUpdate(event);
          break;
        case this.config.topics.inventoryUpdates:
          await this.handleInventoryUpdate(event);
          break;
        case this.config.topics.orderUpdates:
          await this.handleOrderUpdate(event);
          break;
        case this.config.topics.syncCommands:
          await this.handleSyncCommand(event);
          break;
        default:
          logger.warn('Unknown topic', { topic });
      }
    } catch (error) {
      logger.error('Failed to handle Kafka message', {
        error,
        topic,
        partition,
        messageValue: message.value?.toString()
      });
    }
  }

  private async handlePrescriptionUpdate(event: any): Promise<void> {
    try {
      switch (event.type) {
        case 'prescription_created':
        case 'prescription_updated':
          await this.syncService.syncSpecificEntities('prescription', [event.recordId]);
          break;
        case 'prescription_deleted':
          await this.handlePrescriptionDeletion(event.recordId);
          break;
        default:
          logger.warn('Unknown prescription event type', { eventType: event.type });
      }
    } catch (error) {
      logger.error('Failed to handle prescription update', { error, event });
    }
  }

  private async handleMedicationUpdate(event: any): Promise<void> {
    try {
      switch (event.type) {
        case 'medication_created':
        case 'medication_updated':
          await this.syncService.syncSpecificEntities('medication', [event.recordId]);
          break;
        case 'medication_deleted':
          await this.handleMedicationDeletion(event.recordId);
          break;
        default:
          logger.warn('Unknown medication event type', { eventType: event.type });
      }
    } catch (error) {
      logger.error('Failed to handle medication update', { error, event });
    }
  }

  private async handleInventoryUpdate(event: any): Promise<void> {
    try {
      switch (event.type) {
        case 'inventory_updated':
        case 'inventory_adjusted':
          await this.syncService.syncSpecificEntities('inventory', [event.recordId]);
          break;
        case 'batch_expired':
          await this.handleBatchExpiration(event.recordId);
          break;
        default:
          logger.warn('Unknown inventory event type', { eventType: event.type });
      }
    } catch (error) {
      logger.error('Failed to handle inventory update', { error, event });
    }
  }

  private async handleOrderUpdate(event: any): Promise<void> {
    try {
      switch (event.type) {
        case 'order_created':
        case 'order_updated':
        case 'order_filled':
          await this.syncService.syncSpecificEntities('order', [event.recordId]);
          break;
        case 'order_cancelled':
          await this.handleOrderCancellation(event.recordId);
          break;
        default:
          logger.warn('Unknown order event type', { eventType: event.type });
      }
    } catch (error) {
      logger.error('Failed to handle order update', { error, event });
    }
  }

  private async handleSyncCommand(event: any): Promise<void> {
    try {
      switch (event.command) {
        case 'full_sync':
          await this.syncService.performFullSync();
          break;
        case 'incremental_sync':
          await this.syncService.performIncrementalSync();
          break;
        case 'sync_entity':
          await this.syncService.syncSpecificEntities(event.entityType, event.entityIds);
          break;
        default:
          logger.warn('Unknown sync command', { command: event.command });
      }
    } catch (error) {
      logger.error('Failed to handle sync command', { error, event });
    }
  }

  private async handlePrescriptionDeletion(prescriptionId: string): Promise<void> {
    // Handle prescription deletion - may need to cancel related orders
    logger.info('Handling prescription deletion', { prescriptionId });

    // This would typically involve:
    // 1. Finding related pharmacy orders
    // 2. Cancelling or updating those orders
    // 3. Updating the prescription status in microservice
  }

  private async handleMedicationDeletion(medicationId: string): Promise<void> {
    // Handle medication deletion - may need to quarantine related prescriptions
    logger.info('Handling medication deletion', { medicationId });

    // This would typically involve:
    // 1. Finding prescriptions using this medication
    // 2. Updating or quarantining those prescriptions
    // 3. Updating inventory items
  }

  private async handleBatchExpiration(batchId: string): Promise<void> {
    // Handle batch expiration
    logger.info('Handling batch expiration', { batchId });

    // This would typically involve:
    // 1. Updating inventory status
    // 2. Notifying pharmacy staff
    // 3. Adjusting available quantities
  }

  private async handleOrderCancellation(orderId: string): Promise<void> {
    // Handle order cancellation
    logger.info('Handling order cancellation', { orderId });

    // This would typically involve:
    // 1. Updating order status
    // 2. Restoring reserved inventory quantities
    // 3. Notifying relevant parties
  }

  // Publish methods for sending events
  async publishPrescriptionEvent(eventType: string, prescriptionId: string, data: any): Promise<void> {
    await this.publishEvent(this.config.topics.prescriptionUpdates, eventType, prescriptionId, data);
  }

  async publishMedicationEvent(eventType: string, medicationId: string, data: any): Promise<void> {
    await this.publishEvent(this.config.topics.medicationUpdates, eventType, medicationId, data);
  }

  async publishInventoryEvent(eventType: string, inventoryId: string, data: any): Promise<void> {
    await this.publishEvent(this.config.topics.inventoryUpdates, eventType, inventoryId, data);
  }

  async publishOrderEvent(eventType: string, orderId: string, data: any): Promise<void> {
    await this.publishEvent(this.config.topics.orderUpdates, eventType, orderId, data);
  }

  async publishSyncCommand(command: string, data: any): Promise<void> {
    await this.publishEvent(this.config.topics.syncCommands, 'sync_command', command, { command, ...data });
  }

  private async publishEvent(topic: string, eventType: string, key: string, data: any): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [{
          key,
          value: JSON.stringify({
            type: eventType,
            recordId: key,
            data,
            timestamp: new Date().toISOString(),
            source: 'pharmacy-service'
          })
        }]
      });

      logger.info('Published Kafka event', { topic, eventType, key });
    } catch (error) {
      logger.error('Failed to publish Kafka event', { error, topic, eventType, key });
    }
  }

  // Health check and monitoring
  async getHealthStatus(): Promise<any> {
    return {
      kafka: {
        connected: this.isRunning,
        consumer: {
          groupId: this.config.groupId,
          topics: Object.values(this.config.topics)
        },
        producer: {
          connected: true // Producer connection status would be tracked
        }
      },
      lastActivity: new Date().toISOString(),
      messageCount: 0 // Would track actual message counts
    };
  }

  // Error handling and dead letter queue
  private async handleProcessingError(error: Error, message: EachMessagePayload, event: any): Promise<void> {
    logger.error('Processing error occurred', {
      error: error.message,
      topic: message.topic,
      partition: message.partition,
      offset: message.message.offset,
      event
    });

    // Send to dead letter queue
    await this.publishEvent(
      'pharmacy.dlq',
      'processing_error',
      `error_${Date.now()}`,
      {
        originalTopic: message.topic,
        originalMessage: message,
        error: error.message,
        event,
        timestamp: new Date().toISOString()
      }
    );
  }

  // Batch processing for efficiency
  async processBatch(events: any[]): Promise<void> {
    const prescriptionIds = events
      .filter(e => e.type.includes('prescription'))
      .map(e => e.recordId);

    const medicationIds = events
      .filter(e => e.type.includes('medication'))
      .map(e => e.recordId);

    const inventoryIds = events
      .filter(e => e.type.includes('inventory'))
      .map(e => e.recordId);

    const orderIds = events
      .filter(e => e.type.includes('order'))
      .map(e => e.recordId);

    // Process in batches
    if (prescriptionIds.length > 0) {
      await this.syncService.syncSpecificEntities('prescription', prescriptionIds);
    }
    if (medicationIds.length > 0) {
      await this.syncService.syncSpecificEntities('medication', medicationIds);
    }
    if (inventoryIds.length > 0) {
      await this.syncService.syncSpecificEntities('inventory', inventoryIds);
    }
    if (orderIds.length > 0) {
      await this.syncService.syncSpecificEntities('order', orderIds);
    }
  }

  // Configuration management
  updateConfig(newConfig: Partial<KafkaConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Kafka configuration updated', { newConfig });
  }

  getConfig(): KafkaConfig {
    return { ...this.config };
  }
}