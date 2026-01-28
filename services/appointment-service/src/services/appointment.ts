import { PoolClient } from 'pg';
import { setCache, getCache, deleteCache } from '../config/redis';
import { publishMessage } from '../config/kafka';
import { encryptData, decryptData } from '../utils/encryption';
import { logger } from '../utils/logger';
import {
  Appointment,
  CreateAppointment,
  UpdateAppointment,
  AvailabilitySlot,
  SchedulingRule,
  AppointmentSearch,
  AvailabilitySearch,
  CreateAvailabilitySlot,
  CreateSchedulingRule,
} from '../types/appointment';

export class AppointmentService {
  private async encryptSensitiveData(data: any): Promise<any> {
    if (!data || typeof data !== 'object') return data;

    const encrypted = { ...data };

    // Encrypt sensitive fields
    if (encrypted.notes) {
      encrypted.notes = await encryptData(encrypted.notes);
    }
    if (encrypted.reason_for_visit) {
      encrypted.reason_for_visit = await encryptData(encrypted.reason_for_visit);
    }
    if (encrypted.virtual_meeting_link) {
      encrypted.virtual_meeting_link = await encryptData(encrypted.virtual_meeting_link);
    }

    return encrypted;
  }

  private async decryptSensitiveData(data: any): Promise<any> {
    if (!data || typeof data !== 'object') return data;

    const decrypted = { ...data };

    // Decrypt sensitive fields
    if (decrypted.notes) {
      try {
        decrypted.notes = await decryptData(decrypted.notes);
      } catch (error) {
        logger.warn({ msg: 'Failed to decrypt notes', error });
        decrypted.notes = '[ENCRYPTED]';
      }
    }
    if (decrypted.reason_for_visit) {
      try {
        decrypted.reason_for_visit = await decryptData(decrypted.reason_for_visit);
      } catch (error) {
        logger.warn({ msg: 'Failed to decrypt reason_for_visit', error });
        decrypted.reason_for_visit = '[ENCRYPTED]';
      }
    }
    if (decrypted.virtual_meeting_link) {
      try {
        decrypted.virtual_meeting_link = await decryptData(decrypted.virtual_meeting_link);
      } catch (error) {
        logger.warn({ msg: 'Failed to decrypt virtual_meeting_link', error });
        decrypted.virtual_meeting_link = '[ENCRYPTED]';
      }
    }

    return decrypted;
  }

  async createAppointment(
    appointmentData: CreateAppointment,
    client?: PoolClient
  ): Promise<Appointment> {
    const useExternalClient = !!client;
    const dbClient = client || await (await import('../config/database')).getClient();

    try {
      // Check for scheduling conflicts
      await this.checkSchedulingConflicts(appointmentData, dbClient);

      // Encrypt sensitive data
      const encryptedData = await this.encryptSensitiveData(appointmentData);

      const query = `
        INSERT INTO appointments (
          patient_id, provider_id, hospital_id, appointment_type,
          scheduled_at, duration, status, notes, reason_for_visit,
          location, virtual_meeting_link, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const values = [
        encryptedData.patient_id,
        encryptedData.provider_id,
        encryptedData.hospital_id,
        encryptedData.appointment_type,
        encryptedData.scheduled_at,
        encryptedData.duration,
        encryptedData.status || 'scheduled',
        encryptedData.notes,
        encryptedData.reason_for_visit,
        encryptedData.location,
        encryptedData.virtual_meeting_link,
        encryptedData.created_by,
        encryptedData.updated_by,
      ];

      const result = await dbClient.query(query, values);
      const appointment = result.rows[0];

      // Decrypt sensitive data for response
      const decryptedAppointment = await this.decryptSensitiveData(appointment);

      // Cache the appointment
      await setCache(`appointment:${appointment.id}`, decryptedAppointment, 3600); // 1 hour

      // Publish event
      await publishMessage('appointment.created', {
        appointmentId: appointment.id,
        patientId: appointment.patient_id,
        providerId: appointment.provider_id,
        scheduledAt: appointment.scheduled_at,
      });

      logger.info({ msg: 'Appointment created successfully', appointmentId: appointment.id });

      return decryptedAppointment;
    } finally {
      if (!useExternalClient && dbClient) {
        dbClient.release();
      }
    }
  }

  async getAppointmentById(id: string): Promise<Appointment | null> {
    // Try cache first
    const cached = await getCache<Appointment>(`appointment:${id}`);
    if (cached) return cached;

    const { getClient } = await import('../config/database');
    const client = await getClient();

    try {
      const query = 'SELECT * FROM appointments WHERE id = $1';
      const result = await client.query(query, [id]);

      if (result.rows.length === 0) return null;

      const appointment = result.rows[0];
      const decryptedAppointment = await this.decryptSensitiveData(appointment);

      // Cache the result
      await setCache(`appointment:${id}`, decryptedAppointment, 3600);

      return decryptedAppointment;
    } finally {
      client.release();
    }
  }

  async updateAppointment(
    id: string,
    updateData: UpdateAppointment
  ): Promise<Appointment | null> {
    const { transaction } = await import('../config/database');

    return transaction(async (client) => {
      // Check if appointment exists
      const existing = await this.getAppointmentById(id);
      if (!existing) return null;

      // Check for conflicts if time-related fields are being updated
      if (updateData.scheduled_at || updateData.duration) {
        const checkData = {
          ...existing,
          ...updateData,
          scheduled_at: updateData.scheduled_at || existing.scheduled_at,
          duration: updateData.duration || existing.duration,
        };
        await this.checkSchedulingConflicts(checkData, client);
      }

      // Encrypt sensitive data
      const encryptedData = await this.encryptSensitiveData(updateData);

      const fields = Object.keys(encryptedData);
      const values = Object.values(encryptedData);
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

      const query = `
        UPDATE appointments
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(query, [id, ...values]);
      if (result.rows.length === 0) return null;

      const appointment = result.rows[0];
      const decryptedAppointment = await this.decryptSensitiveData(appointment);

      // Update cache
      await setCache(`appointment:${id}`, decryptedAppointment, 3600);

      // Publish event
      await publishMessage('appointment.updated', {
        appointmentId: id,
        changes: Object.keys(updateData),
      });

      logger.info({ msg: 'Appointment updated successfully', appointmentId: id });

      return decryptedAppointment;
    });
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const { getClient } = await import('../config/database');
    const client = await getClient();

    try {
      // Soft delete by setting status to cancelled
      const query = `
        UPDATE appointments
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1 AND status NOT IN ('completed', 'in-progress')
        RETURNING id
      `;

      const result = await client.query(query, [id]);
      const deleted = result.rows.length > 0;

      if (deleted) {
        // Clear cache
        await deleteCache(`appointment:${id}`);

        // Publish event
        await publishMessage('appointment.cancelled', { appointmentId: id });

        logger.info({ msg: 'Appointment cancelled successfully', appointmentId: id });
      }

      return deleted;
    } finally {
      client.release();
    }
  }

  async searchAppointments(searchParams: AppointmentSearch): Promise<{
    appointments: Appointment[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const { getClient } = await import('../config/database');
    const client = await getClient();

    try {
      let whereClause = 'WHERE a.hospital_id = $1';
      const values: any[] = [searchParams.hospital_id];
      let paramIndex = 2;

      if (searchParams.patient_id) {
        whereClause += ` AND a.patient_id = $${paramIndex}`;
        values.push(searchParams.patient_id);
        paramIndex++;
      }

      if (searchParams.provider_id) {
        whereClause += ` AND a.provider_id = $${paramIndex}`;
        values.push(searchParams.provider_id);
        paramIndex++;
      }

      if (searchParams.status) {
        whereClause += ` AND a.status = $${paramIndex}`;
        values.push(searchParams.status);
        paramIndex++;
      }

      if (searchParams.appointment_type) {
        whereClause += ` AND a.appointment_type = $${paramIndex}`;
        values.push(searchParams.appointment_type);
        paramIndex++;
      }

      if (searchParams.start_date && searchParams.end_date) {
        whereClause += ` AND a.scheduled_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        values.push(searchParams.start_date, searchParams.end_date);
        paramIndex += 2;
      }

      const sortOrder = searchParams.sort_order === 'desc' ? 'DESC' : 'ASC';
      const orderBy = `ORDER BY a.${searchParams.sort_by} ${sortOrder}`;

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM appointments a ${whereClause}`;
      const countResult = await client.query(countQuery, values.slice(0, paramIndex - 1));
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const dataQuery = `
        SELECT a.* FROM appointments a
        ${whereClause}
        ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(searchParams.limit, searchParams.offset);
      const result = await client.query(dataQuery, values);

      // Decrypt sensitive data
      const appointments = await Promise.all(
        result.rows.map(appointment => this.decryptSensitiveData(appointment))
      );

      return {
        appointments,
        total,
        limit: searchParams.limit,
        offset: searchParams.offset,
      };
    } finally {
      client.release();
    }
  }

  private async checkSchedulingConflicts(
    appointmentData: CreateAppointment,
    client: PoolClient
  ): Promise<void> {
    const scheduledAt = new Date(appointmentData.scheduled_at);
    const endTime = new Date(scheduledAt.getTime() + appointmentData.duration * 60000);

    const query = `
      SELECT id FROM appointments
      WHERE provider_id = $1
        AND status NOT IN ('cancelled', 'no-show')
        AND (
          (scheduled_at <= $2 AND scheduled_at + (duration * INTERVAL '1 minute') > $2) OR
          (scheduled_at < $3 AND scheduled_at + (duration * INTERVAL '1 minute') >= $3) OR
          (scheduled_at >= $2 AND scheduled_at + (duration * INTERVAL '1 minute') <= $3)
        )
    `;

    const result = await client.query(query, [
      appointmentData.provider_id,
      scheduledAt.toISOString(),
      endTime.toISOString(),
    ]);

    if (result.rows.length > 0) {
      throw new Error('Scheduling conflict detected');
    }
  }

  // Additional methods for availability and scheduling rules would go here
  // These are simplified versions - full implementation would include:
  // - getProviderAvailability()
  // - createAvailabilitySlot()
  // - getSchedulingRules()
  // - createSchedulingRule()
  // - checkAvailability()
  // - rescheduleAppointment()
}