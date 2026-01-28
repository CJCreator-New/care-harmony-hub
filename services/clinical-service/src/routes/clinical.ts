import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ClinicalService } from '../services/clinical';
import { logger } from '../utils/logger';

export async function clinicalRoutes(fastify: FastifyInstance, clinicalService?: ClinicalService) {
  const service = clinicalService || new ClinicalService();

  // Health check
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ status: 'ok', service: 'clinical-service' });
  });

  // Consultation routes
  fastify.post('/consultations', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const consultationData = request.body as any;
      const userId = '550e8400-e29b-41d4-a716-446655440001'; // Mock user ID
      const hospitalId = consultationData.hospital_id;

      const consultation = await service.createConsultation(
        consultationData,
        userId,
        hospitalId
      );

      logger.info({ msg: 'Consultation created successfully', consultationId: consultation.id });

      return reply.code(201).send({
        data: consultation,
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to create consultation', error, body: request.body });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create consultation',
        success: false,
      });
    }
  });

  fastify.get('/consultations/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const hospitalId = '550e8400-e29b-41d4-a716-446655440002'; // Mock hospital ID

      const consultation = await service.getConsultation(id, hospitalId);

      if (!consultation) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Consultation not found',
          success: false,
        });
      }

      return reply.send({
        data: consultation,
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to get consultation', error, params: request.params });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get consultation',
        success: false,
      });
    }
  });

  fastify.get('/consultations', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as any;
      const hospitalId = '550e8400-e29b-41d4-a716-446655440002'; // Mock hospital ID

      const result = await service.searchConsultations({
        ...query,
        hospital_id: hospitalId,
      });

      return reply.send({
        data: result.consultations,
        total: result.total,
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to search consultations', error, query: request.query });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to search consultations',
        success: false,
      });
    }
  });

  // Medical records routes
  fastify.post('/records', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const recordData = request.body as any;
      const userId = '550e8400-e29b-41d4-a716-446655440001'; // Mock user ID

      const record = await service.createMedicalRecord(recordData, userId);

      logger.info({ msg: 'Medical record created successfully', recordId: record.id });

      return reply.code(201).send({
        data: record,
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to create medical record', error, body: request.body });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create medical record',
        success: false,
      });
    }
  });

  fastify.get('/records/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const hospitalId = '550e8400-e29b-41d4-a716-446655440002'; // Mock hospital ID

      const record = await service.getMedicalRecord(id, hospitalId);

      if (!record) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Medical record not found',
          success: false,
        });
      }

      return reply.send({
        data: record,
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to get medical record', error, params: request.params });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get medical record',
        success: false,
      });
    }
  });

  fastify.get('/records', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as any;
      const hospitalId = '550e8400-e29b-41d4-a716-446655440002'; // Mock hospital ID

      const result = await service.searchMedicalRecords({
        ...query,
        hospital_id: hospitalId,
      });

      return reply.send({
        data: result.records,
        total: result.total,
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to search medical records', error, query: request.query });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to search medical records',
        success: false,
      });
    }
  });
}