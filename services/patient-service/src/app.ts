import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { logger } from './utils/logger';
import { config } from './config/environment';
import { registerRoutes } from './routes';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { connectKafka } from './config/kafka';

export async function createApp(): Promise<FastifyInstance> {
  const app = Fastify({
    trustProxy: true,
    disableRequestLogging: config.NODE_ENV === 'production',
  });

  // Register plugins
  await app.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  });

  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_EXPIRES_IN,
    },
  });

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
    skipOnError: true,
  });

  // Health check endpoint
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'patient-service',
      version: config.VERSION,
    };
  });

  // Readiness check endpoint
  app.get('/ready', async () => {
    try {
      // Check database connection
      const dbHealth = await checkDatabaseHealth();
      // Check Redis connection
      const redisHealth = await checkRedisHealth();
      // Check Kafka connection
      const kafkaHealth = await checkKafkaHealth();

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbHealth,
          redis: redisHealth,
          kafka: kafkaHealth,
        },
      };
    } catch (error) {
      app.log.error({ msg: 'Readiness check failed', error });
      throw new Error('Service not ready');
    }
  });

  // Register routes
  await registerRoutes(app);

  return app;
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const pool = connectDatabase();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    logger.error({ msg: 'Database health check failed', error });
    return false;
  }
}

async function checkRedisHealth(): Promise<boolean> {
  try {
    const redis = connectRedis();
    await redis.ping();
    return true;
  } catch (error) {
    logger.error({ msg: 'Redis health check failed', error });
    return false;
  }
}

async function checkKafkaHealth(): Promise<boolean> {
  try {
    const kafka = connectKafka();
    const admin = kafka.admin();
    await admin.connect();
    await admin.disconnect();
    return true;
  } catch (error) {
    logger.error({ msg: 'Kafka health check failed', error });
    return false;
  }
}

export async function startServer(): Promise<void> {
  try {
    const app = await createApp();

    await app.listen({
      host: config.HOST,
      port: config.PORT,
    });

    app.log.info(`Patient Service listening on ${config.HOST}:${config.PORT}`);
  } catch (error) {
    logger.error({ msg: 'Failed to start server', error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});