import { buildApp } from './app';
import { config } from './config/environment';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { getProducer } from './config/kafka';

async function startServer() {
  try {
    // Validate environment configuration
    if (!config.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    if (!config.REDIS_URL) {
      throw new Error('REDIS_URL environment variable is required');
    }

    if (!config.KAFKA_BROKERS) {
      throw new Error('KAFKA_BROKERS environment variable is required');
    }

    if (!config.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    // Test database connection
    logger.info('Testing database connection...');
    const pool = connectDatabase();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('Database connection successful');

    // Test Redis connection
    logger.info('Testing Redis connection...');
    const redis = await connectRedis();
    logger.info('Redis connection successful');

    // Test Kafka connection
    logger.info('Testing Kafka connection...');
    const kafkaProducer = await getProducer();
    logger.info('Kafka connection successful');

    // Build and start the application
    const app = await buildApp();

    const port = config.PORT || 3003;
    const host = config.HOST || '0.0.0.0';

    await app.listen({ port, host });

    logger.info(`Clinical service listening on http://${host}:${port}`);
    logger.info(`Health check available at http://${host}:${port}/health`);
    logger.info(`API documentation available at http://${host}:${port}/api/v1`);

  } catch (error) {
    logger.error('Failed to start clinical service:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();