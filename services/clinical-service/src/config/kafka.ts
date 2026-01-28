import { Kafka, Producer, Consumer } from 'kafkajs';
import { config } from './environment';

let kafka: Kafka | undefined;
let producer: Producer | undefined;
let consumer: Consumer | undefined;

export function connectKafka(): Kafka {
  if (kafka) return kafka;

  const saslConfig = config.KAFKA_SASL_USERNAME && config.KAFKA_SASL_PASSWORD ? {
    mechanism: 'plain' as const,
    username: config.KAFKA_SASL_USERNAME,
    password: config.KAFKA_SASL_PASSWORD,
  } : undefined;

  const kafkaConfig: any = {
    clientId: config.KAFKA_CLIENT_ID,
    brokers: config.KAFKA_BROKERS.split(','),
    ssl: config.KAFKA_SSL,
  };

  if (saslConfig) {
    kafkaConfig.sasl = saslConfig;
  }

  kafka = new Kafka(kafkaConfig);

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

export async function publishMessage(topic: string, message: any): Promise<void> {
  const producer = await getProducer();
  await producer.send({
    topic,
    messages: [
      {
        value: JSON.stringify(message),
        timestamp: Date.now().toString(),
      },
    ],
  });
}

export async function closeKafka(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = undefined;
  }

  if (consumer) {
    await consumer.disconnect();
    consumer = undefined;
  }

  kafka = undefined;
}

// Export producer for backward compatibility
export { producer as kafkaProducer };