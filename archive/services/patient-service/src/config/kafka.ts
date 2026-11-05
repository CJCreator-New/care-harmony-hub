import { Kafka, Producer, Consumer, Admin } from 'kafkajs';
import { config } from './environment';
import { logger } from '../utils/logger';

let kafkaInstance: Kafka | null = null;
let producer: Producer | null = null;
let consumer: Consumer | null = null;
let admin: Admin | null = null;

export function connectKafka(): Kafka {
  if (!kafkaInstance) {
    kafkaInstance = new Kafka({
      clientId: config.KAFKA_CLIENT_ID,
      brokers: config.KAFKA_BROKERS,
      logLevel: 1, // WARN level
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });
  }

  return kafkaInstance;
}

export async function getProducer(): Promise<Producer> {
  if (!producer) {
    const kafka = connectKafka();
    producer = kafka.producer();

    producer.on('producer.connect', () => {
      logger.info('Kafka producer connected');
    });

    producer.on('producer.disconnect', () => {
      logger.info('Kafka producer disconnected');
    });

    await producer.connect();
  }

  return producer;
}

export async function getConsumer(): Promise<Consumer> {
  if (!consumer) {
    const kafka = connectKafka();
    consumer = kafka.consumer({ groupId: config.KAFKA_GROUP_ID });

    consumer.on('consumer.connect', () => {
      logger.info('Kafka consumer connected');
    });

    consumer.on('consumer.disconnect', () => {
      logger.info('Kafka consumer disconnected');
    });

    await consumer.connect();
  }

  return consumer;
}

export async function getAdmin(): Promise<Admin> {
  if (!admin) {
    const kafka = connectKafka();
    admin = kafka.admin();

    admin.on('admin.connect', () => {
      logger.info('Kafka admin connected');
    });

    admin.on('admin.disconnect', () => {
      logger.info('Kafka admin disconnected');
    });

    await admin.connect();
  }

  return admin;
}

export async function publishMessage(
  topic: string,
  message: any,
  key?: string
): Promise<void> {
  try {
    const producer = await getProducer();
    await producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(message),
          timestamp: Date.now().toString(),
        },
      ],
    });
    logger.debug({ msg: 'Message published to Kafka', topic, key });
  } catch (error) {
    logger.error({ msg: 'Failed to publish message to Kafka', topic, key, error });
    throw error;
  }
}

export async function subscribeToTopic(
  topic: string,
  handler: (message: any) => Promise<void>
): Promise<void> {
  try {
    const consumer = await getConsumer();
    await consumer.subscribe({ topic, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const value = message.value?.toString();
          if (value) {
            const parsedMessage = JSON.parse(value);
            await handler(parsedMessage);
          }
        } catch (error) {
          logger.error({ msg: 'Error processing Kafka message', topic, partition, error });
        }
      },
    });

    logger.info(`Subscribed to Kafka topic: ${topic}`);
  } catch (error) {
    logger.error({ msg: 'Failed to subscribe to Kafka topic', topic, error });
    throw error;
  }
}

export async function closeKafka(): Promise<void> {
  try {
    if (producer) {
      await producer.disconnect();
      producer = null;
    }

    if (consumer) {
      await consumer.disconnect();
      consumer = null;
    }

    if (admin) {
      await admin.disconnect();
      admin = null;
    }

    kafkaInstance = null;
    logger.info('Kafka connections closed');
  } catch (error) {
    logger.error({ msg: 'Error closing Kafka connections', error });
  }
}