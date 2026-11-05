import { createApp } from './app';
import { config } from './config/environment';
import { logger } from './utils/logger';

async function startServer(): Promise<void> {
  try {
    const app = await createApp();

    await app.listen({
      port: config.PORT,
      host: config.HOST,
    });

    logger.info({
      msg: 'Appointment service started successfully',
      port: config.PORT,
      host: config.HOST,
      environment: config.NODE_ENV,
    });

    // Log registered routes
    const routes = app.printRoutes();
    logger.debug({ msg: 'Registered routes', routes });

  } catch (error) {
    logger.error({ msg: 'Failed to start appointment service', error });
    process.exit(1);
  }
}

startServer();