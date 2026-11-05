import { FastifyInstance } from 'fastify';
import { patientRoutes } from './patient';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Register patient routes
  await app.register(patientRoutes, { prefix: '/api/v1/patients' });

  // Register additional route modules here as they are created
  // await app.register(appointmentRoutes, { prefix: '/api/v1/appointments' });
  // await app.register(medicalRecordRoutes, { prefix: '/api/v1/medical-records' });
}