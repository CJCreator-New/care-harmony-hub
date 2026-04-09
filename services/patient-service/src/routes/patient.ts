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
import { extractHospitalContext, validateHospitalContext } from '../utils/hospitalScoping';

export async function patientRoutes(app: FastifyInstance): Promise<void> {
  const patientService = new PatientService();

  // Create patient
  app.post('/', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<PatientResponse>> => {
    try {
      const { hospitalId } = extractHospitalContext(request);
      
      // Validate hospital context exists
      if (!hospitalId) {
        logger.warn({ msg: 'Hospital context missing for create patient' });
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Hospital context required',
          success: false,
        });
      }

      const patientData = request.body as CreatePatient;
      // For now, we'll use a mock user ID - in production this would come from JWT
      const createdBy = '550e8400-e29b-41d4-a716-446655440001';

      const patient = await patientService.createPatient({
        ...patientData,
        hospital_id: hospitalId,
        created_by: createdBy,
        updated_by: createdBy,
      });

      logger.info({ msg: 'Patient created successfully', patientId: patient.id, hospitalId });

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
      const { hospitalId } = extractHospitalContext(request);
      
      // Validate hospital context exists
      if (!hospitalId) {
        logger.warn({ msg: 'Hospital context missing for get patient', patientId: id });
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Hospital context required',
          success: false,
        });
      }

      const patient = await patientService.getPatientById(id, hospitalId);

      if (!patient) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Patient not found',
          success: false,
        });
      }

      logger.info({ msg: 'Patient retrieved successfully', patientId: id, hospitalId });

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
      const { hospitalId } = extractHospitalContext(request);
      
      // Validate hospital context exists
      if (!hospitalId) {
        logger.warn({ msg: 'Hospital context missing for update patient', patientId: id });
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Hospital context required',
          success: false,
        });
      }

      const updateData = request.body as UpdatePatient;
      // For now, we'll use a mock user ID - in production this would come from JWT
      const updatedBy = '550e8400-e29b-41d4-a716-446655440001';

      const patient = await patientService.updatePatient(id, hospitalId, {
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

      logger.info({ msg: 'Patient updated successfully', patientId: id, hospitalId });

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
      const { hospitalId } = extractHospitalContext(request);
      
      // Validate hospital context exists
      if (!hospitalId) {
        logger.warn({ msg: 'Hospital context missing for delete patient', patientId: id });
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Hospital context required',
          success: false,
        });
      }

      const deleted = await patientService.deletePatient(id, hospitalId);

      if (!deleted) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Patient not found',
          success: false,
        });
      }

      logger.info({ msg: 'Patient deleted successfully', patientId: id, hospitalId });

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
      const { hospitalId } = extractHospitalContext(request);
      
      // Validate hospital context exists
      if (!hospitalId) {
        logger.warn({ msg: 'Hospital context missing for search patients' });
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Hospital context required',
          success: false,
        });
      }

      const searchParams = request.query as PatientSearch;
      const result = await patientService.searchPatients(searchParams, hospitalId);

      const response: PatientsResponse = {
        data: result.patients,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        success: true as const,
      };

      logger.info({ msg: 'Patients searched successfully', hospitalId, resultCount: result.total });

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