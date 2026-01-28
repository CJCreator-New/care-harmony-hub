import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { logger } from './utils/logger';
import { config } from './config/environment';
import { appointmentRoutes } from './routes/appointment';
import { connectDatabase, closeDatabase } from './config/database';

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
      service: 'appointment-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  });

  // Readiness check endpoint
  app.get('/ready', async () => {
    try {
      // Check database connectivity
      const pool = connectDatabase();
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      return {
        status: 'ready',
        service: 'appointment-service',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ msg: 'Readiness check failed', error });
      throw new Error('Service not ready');
    }
  });

  // Register routes
  await app.register(appointmentRoutes, { prefix: '/api/v1/appointments' });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info({ msg: 'Shutting down appointment service' });
    await closeDatabase();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return app;
}