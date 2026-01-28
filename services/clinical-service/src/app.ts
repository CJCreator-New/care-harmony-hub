import fastify, { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';
import { clinicalRoutes } from './routes/clinical';
import { ClinicalService } from './services/clinical';
import { config } from './config/environment';
import { logger } from './utils/logger';

export async function buildApp(clinicalService?: ClinicalService): Promise<FastifyInstance> {
  const app = fastify({
    logger: true,
  });

  // Register plugins
  await app.register(fastifyCors, {
    origin: config.CORS_ORIGIN ? config.CORS_ORIGIN.split(',') : true,
    credentials: true,
  });

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  await app.register(fastifyRateLimit, {
    max: config.RATE_LIMIT_MAX || 100,
    timeWindow: config.RATE_LIMIT_WINDOW || '1 minute',
    skipOnError: true,
  });

  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
  });

  // Health check endpoint
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'clinical-service',
      version: '1.0.0',
    };
  });

  // Readiness check endpoint
  app.get('/ready', async () => {
    // Add database and Redis connectivity checks here
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      service: 'clinical-service',
    };
  });

  // Authentication decorator
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or missing authentication token',
        success: false,
      });
    }
  });

  // Register routes
  const service = clinicalService || new ClinicalService();
  await app.register((fastifyInstance) => clinicalRoutes(fastifyInstance, service), { prefix: '/api/v1' });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    logger.error('Unhandled error:', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      ip: request.ip,
    });

    // Don't leak error details in production
    const isDevelopment = config.NODE_ENV === 'development';

    reply.code(error.statusCode || 500).send({
      error: error.name || 'Internal Server Error',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
      success: false,
      ...(isDevelopment && { stack: error.stack }),
    });
  });

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`,
      success: false,
    });
  });

  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      await app.close();

      logger.info('Clinical service shut down complete');
      process.exit(0);
    });
  });

  return app;
}