import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppointmentService } from '../services/appointment';
import {
  CreateAppointment,
  UpdateAppointment,
  AppointmentSearch,
  AppointmentResponse,
  AppointmentsResponse,
  ApiResponse,
} from '../types/appointment';
import { logger } from '../utils/logger';

export async function appointmentRoutes(app: FastifyInstance): Promise<void> {
  const appointmentService = new AppointmentService();

  // Create appointment
  app.post('/', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<AppointmentResponse>> => {
    try {
      const appointmentData = request.body as CreateAppointment;
      // For now, we'll use a mock user ID - in production this would come from JWT
      const createdBy = '550e8400-e29b-41d4-a716-446655440001';

      const appointment = await appointmentService.createAppointment({
        ...appointmentData,
      });

      logger.info({ msg: 'Appointment created successfully', appointmentId: appointment.id });

      return reply.code(201).send({
        data: appointment,
        success: true,
      });
    } catch (error: any) {
      logger.error({ msg: 'Failed to create appointment', error, body: request.body });

      if (error.message === 'Scheduling conflict detected') {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'Appointment scheduling conflict detected',
          success: false,
        });
      }

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create appointment',
        success: false,
      });
    }
  });

  // Get appointment by ID
  app.get('/:id', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<AppointmentResponse>> => {
    try {
      const { id } = request.params as { id: string };

      const appointment = await appointmentService.getAppointmentById(id);

      if (!appointment) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Appointment not found',
          success: false,
        });
      }

      logger.info({ msg: 'Appointment retrieved successfully', appointmentId: id });

      return {
        data: appointment,
        success: true,
      };
    } catch (error) {
      logger.error({ msg: 'Failed to retrieve appointment', error, params: request.params });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve appointment',
        success: false,
      });
    }
  });

  // Update appointment
  app.put('/:id', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<AppointmentResponse>> => {
    try {
      const { id } = request.params as { id: string };
      const updateData = request.body as UpdateAppointment;
      // For now, we'll use a mock user ID - in production this would come from JWT
      const updatedBy = '550e8400-e29b-41d4-a716-446655440001';

      const appointment = await appointmentService.updateAppointment(id, {
        ...updateData,
      });

      if (!appointment) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Appointment not found',
          success: false,
        });
      }

      logger.info({ msg: 'Appointment updated successfully', appointmentId: id });

      return {
        data: appointment,
        success: true,
      };
    } catch (error: any) {
      logger.error({ msg: 'Failed to update appointment', error, params: request.params, body: request.body });

      if (error.message === 'Scheduling conflict detected') {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'Appointment scheduling conflict detected',
          success: false,
        });
      }

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update appointment',
        success: false,
      });
    }
  });

  // Cancel appointment
  app.post('/:id/cancel', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<{ data: { message: string }; success: true }>> => {
    try {
      const { id } = request.params as { id: string };

      const cancelled = await appointmentService.deleteAppointment(id);

      if (!cancelled) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Appointment not found or cannot be cancelled',
          success: false,
        });
      }

      logger.info({ msg: 'Appointment cancelled successfully', appointmentId: id });

      return {
        data: { message: 'Appointment cancelled successfully' },
        success: true,
      };
    } catch (error) {
      logger.error({ msg: 'Failed to cancel appointment', error, params: request.params });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to cancel appointment',
        success: false,
      });
    }
  });

  // Search appointments
  app.get('/', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<AppointmentsResponse>> => {
    try {
      const searchParams = request.query as AppointmentSearch;
      const result = await appointmentService.searchAppointments(searchParams);

      return {
        data: result.appointments,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        success: true,
      } as AppointmentsResponse;
    } catch (error) {
      logger.error({ msg: 'Failed to search appointments', error, query: request.query });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to search appointments',
        success: false,
      });
    }
  });

  // Get appointments by patient
  app.get('/patient/:patientId', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<AppointmentsResponse>> => {
    try {
      const { patientId } = request.params as { patientId: string };
      const searchParams = request.query as Omit<AppointmentSearch, 'patient_id'>;

      const result = await appointmentService.searchAppointments({
        ...searchParams,
        patient_id: patientId,
      });

      return {
        data: result.appointments,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        success: true,
      } as AppointmentsResponse;
    } catch (error) {
      logger.error({ msg: 'Failed to get patient appointments', error, params: request.params, query: request.query });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get patient appointments',
        success: false,
      });
    }
  });

  // Get appointments by provider
  app.get('/provider/:providerId', async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<AppointmentsResponse>> => {
    try {
      const { providerId } = request.params as { providerId: string };
      const searchParams = request.query as Omit<AppointmentSearch, 'provider_id'>;

      const result = await appointmentService.searchAppointments({
        ...searchParams,
        provider_id: providerId,
      });

      return {
        data: result.appointments,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        success: true,
      } as AppointmentsResponse;
    } catch (error) {
      logger.error({ msg: 'Failed to get provider appointments', error, params: request.params, query: request.query });
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get provider appointments',
        success: false,
      });
    }
  });
}