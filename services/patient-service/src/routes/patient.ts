import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PatientService } from '../services/patient';
import {
  CreatePatient,
  UpdatePatient,
  PatientSearch,
  PatientResponse,
  PatientsResponse,
  ApiResponse,
  ErrorResponse,
} from '../types/patient';
import { logger } from '../utils/logger';

export async function patientRoutes(app: FastifyInstance): Promise<void> {
  const patientService = new PatientService();

  // Create patient
  app.post('/', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<PatientResponse>> => {
    try {
      const patientData = request.body as CreatePatient;
      // For now, we'll use a mock user ID - in production this would come from JWT
      const createdBy = '550e8400-e29b-41d4-a716-446655440001';

      const patient = await patientService.createPatient({
        ...patientData,
        created_by: createdBy,
        updated_by: createdBy,
      });

      logger.info({ msg: 'Patient created successfully', patientId: patient.id });

      return {
        data: patient,
        success: true,
      };
    } catch (error) {
      logger.error({ msg: 'Failed to create patient', error, body: request.body });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create patient',
        success: false,
      });
    }
  });

  // Get patient by ID
  app.get('/:id', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<PatientResponse>> => {
    try {
      const { id } = request.params as { id: string };

      const patient = await patientService.getPatientById(id);

      if (!patient) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Patient not found',
          success: false,
        });
      }

      logger.info({ msg: 'Patient retrieved successfully', patientId: id });

      return {
        data: patient,
        success: true,
      };
    } catch (error) {
      logger.error({ msg: 'Failed to retrieve patient', error, params: request.params });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve patient',
        success: false,
      });
    }
  });

  // Update patient
  app.put('/:id', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<PatientResponse>> => {
    try {
      const { id } = request.params as { id: string };
      const updateData = request.body as UpdatePatient;
      // For now, we'll use a mock user ID - in production this would come from JWT
      const updatedBy = '550e8400-e29b-41d4-a716-446655440001';

      const patient = await patientService.updatePatient(id, {
        ...updateData,
        updated_by: updatedBy,
      });

      if (!patient) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Patient not found',
          success: false,
        });
      }

      logger.info({ msg: 'Patient updated successfully', patientId: id });

      return {
        data: patient,
        success: true,
      };
    } catch (error) {
      logger.error({ msg: 'Failed to update patient', error, params: request.params, body: request.body });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update patient',
        success: false,
      });
    }
  });

  // Delete patient (soft delete)
  app.delete('/:id', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<{ data: { message: string }; success: true }>> => {
    try {
      const { id } = request.params as { id: string };
      const deleted = await patientService.deletePatient(id);

      if (!deleted) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Patient not found',
          success: false,
        });
      }

      logger.info({ msg: 'Patient deleted successfully', patientId: id });

      return {
        data: { message: 'Patient deleted successfully' },
        success: true,
      };
    } catch (error) {
      logger.error({ msg: 'Failed to delete patient', error, params: request.params });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete patient',
        success: false,
      });
    }
  });

  // Search patients
  app.get('/', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any> => {
    try {
      const searchParams = request.query as PatientSearch;
      const result = await patientService.searchPatients(searchParams);

      const response: PatientsResponse = {
        data: result.patients,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        success: true as const,
      };

      return response;
    } catch (error) {
      logger.error({ msg: 'Failed to search patients', error, query: request.query });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to search patients',
        success: false,
      });
    }
  });
}