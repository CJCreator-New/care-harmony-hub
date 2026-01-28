import { Kafka, Producer, Consumer } from 'kafkajs';
import { config } from './environment';

let kafka: Kafka;
let producer: Producer;
let consumer: Consumer;

export function connectKafka(): Kafka {
  if (kafka) return kafka;

  if (!config.KAFKA_BROKERS) {
    throw new Error('Kafka brokers not configured');
  }

  kafka = new Kafka({
    clientId: config.KAFKA_CLIENT_ID,
    brokers: config.KAFKA_BROKERS.split(','),
  });

  return kafka;
}

export async function getProducer(): Promise<Producer> {
  if (producer) return producer;

  const kafka = connectKafka();
  producer = kafka.producer();

  await producer.connect();
  return producer;
}

export async function getConsumer(groupId: string): Promise<Consumer> {
  if (consumer) return consumer;

  const kafka = connectKafka();
  consumer = kafka.consumer({ groupId });

  await consumer.connect();
  return consumer;
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
          headers: {
            timestamp: Date.now().toString(),
            service: 'appointment-service',
          },
        },
      ],
    });
  } catch (error) {
    console.error('Failed to publish message:', error);
    // Don't throw - message publishing failures shouldn't break the app
  }
}