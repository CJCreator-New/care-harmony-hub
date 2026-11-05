import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ClinicalService } from '../services/clinical';
import { logger } from '../utils/logger';

/**
 * Extracts and validates user ID from JWT token
 * Throws 401 error if user ID is not present
 */
function getUserIdFromRequest(request: FastifyRequest): string {
  const userId = (request as any).user?.id;
  if (!userId) {
    throw new Error('Unauthorized: User ID not found in token');
  }
  return userId;
}

/**
 * Extracts and validates hospital ID from JWT token or request body
 * Throws 400 error if hospital ID is not present
 */
function getHospitalIdFromRequest(request: FastifyRequest, fallbackFromBody?: boolean): string {
  const hospitalId = (request as any).user?.hospital_id;
  
  if (hospitalId) {
    return hospitalId;
  }
  
  // If fallbackFromBody is true, try to get hospital_id from request body
  if (fallbackFromBody) {
    const body = request.body as any;
    if (body?.hospital_id) {
      return body.hospital_id;
    }
  }
  
  throw new Error('Bad Request: Hospital ID is required');
}

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
      const userId = getUserIdFromRequest(request);
      const hospitalId = getHospitalIdFromRequest(request, true);

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
      const hospitalId = getHospitalIdFromRequest(request);

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
      const hospitalId = getHospitalIdFromRequest(request);

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

  // Clinical workflow routes
  fastify.get('/workflows', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as any;
      const hospitalId = getHospitalIdFromRequest(request);

      const result = await service.searchClinicalWorkflows({
        ...query,
        hospital_id: hospitalId,
      });

      return reply.send({
        data: result.workflows,
        total: result.total,
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to search clinical workflows', error, query: request.query });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to search clinical workflows',
        success: false,
      });
    }
  });

  fastify.get('/workflows/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const hospitalId = getHospitalIdFromRequest(request);

      const workflow = await service.getClinicalWorkflow(id, hospitalId);

      if (!workflow) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Clinical workflow not found',
          success: false,
        });
      }

      return reply.send({
        data: workflow,
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to get clinical workflow', error, params: request.params });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get clinical workflow',
        success: false,
      });
    }
  });

  // Medical records routes
  fastify.post('/records', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const recordData = request.body as any;
      const userId = getUserIdFromRequest(request);

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
      const hospitalId = getHospitalIdFromRequest(request);

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
      const hospitalId = getHospitalIdFromRequest(request);

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

  fastify.post('/workflows', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const workflowData = request.body as any;
      const userId = getUserIdFromRequest(request);
      const hospitalId = getHospitalIdFromRequest(request, true);

      const workflow = await service.createClinicalWorkflow(workflowData, userId, hospitalId);

      logger.info({ msg: 'Clinical workflow created successfully', workflowId: workflow.id });

      return reply.code(201).send({
        data: workflow,
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to create clinical workflow', error, body: request.body });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create clinical workflow',
        success: false,
      });
    }
  });

  fastify.put('/workflows/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const workflowData = request.body as any;
      const userId = getUserIdFromRequest(request);
      const hospitalId = getHospitalIdFromRequest(request);

      const workflow = await service.updateClinicalWorkflow(id, workflowData, userId, hospitalId);

      return reply.send({
        data: workflow,
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to update clinical workflow', error, params: request.params, body: request.body });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update clinical workflow',
        success: false,
      });
    }
  });

  // Advanced Workflow State Management Routes

  fastify.get('/workflows/:workflowId/state', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { workflowId } = request.params as { workflowId: string };

      const state = await service.getWorkflowState(workflowId);

      if (!state) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Workflow state not found',
          success: false,
        });
      }

      return reply.send({
        data: state,
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to get workflow state', error, params: request.params });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get workflow state',
        success: false,
      });
    }
  });

  fastify.post('/workflows/:workflowId/state/transition', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { workflowId } = request.params as { workflowId: string };
      const { newState, newCurrentStep, reason, metadata } = request.body as any;
      const userId = getUserIdFromRequest(request);

      const state = await service.transitionWorkflowState(
        workflowId,
        newState,
        newCurrentStep,
        userId,
        reason,
        metadata
      );

      return reply.send({
        data: state,
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to transition workflow state', error, params: request.params, body: request.body });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to transition workflow state',
        success: false,
      });
    }
  });

  fastify.get('/workflows/:workflowId/history', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { workflowId } = request.params as { workflowId: string };
      const { limit } = request.query as { limit?: string };

      const history = await service.getWorkflowHistory(workflowId, limit ? parseInt(limit) : 50);

      return reply.send({
        data: history,
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to get workflow history', error, params: request.params });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get workflow history',
        success: false,
      });
    }
  });

  fastify.post('/workflows/:workflowId/state/recover', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { workflowId } = request.params as { workflowId: string };
      const { targetVersion, reason } = request.body as any;
      const userId = getUserIdFromRequest(request);

      const state = await service.recoverWorkflowState(workflowId, targetVersion, userId, reason);

      return reply.send({
        data: state,
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to recover workflow state', error, params: request.params, body: request.body });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to recover workflow state',
        success: false,
      });
    }
  });

  fastify.get('/workflows/:workflowId/state/validate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { workflowId } = request.params as { workflowId: string };

      const isValid = await service.validateWorkflowStateIntegrity(workflowId);

      return reply.send({
        data: { integrity_valid: isValid },
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to validate workflow state integrity', error, params: request.params });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to validate workflow state integrity',
        success: false,
      });
    }
  });

  fastify.get('/workflows/:workflowId/state/statistics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { workflowId } = request.params as { workflowId: string };

      const stats = await service.getWorkflowStateStatistics(workflowId);

      return reply.send({
        data: stats,
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to get workflow state statistics', error, params: request.params });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get workflow state statistics',
        success: false,
      });
    }
  });
}