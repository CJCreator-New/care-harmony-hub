import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../config/database';
import { setCache, getCache, deleteCache } from '../config/redis';
import { publishMessage } from '../config/kafka';
import {
  Patient,
  CreatePatient,
  UpdatePatient,
  PatientSearch,
} from '../types/patient';
import { logger, logDatabaseOperation } from '../utils/logger';
import { encryptData, decryptData } from '../utils/encryption';

export class PatientService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = 'patient:';

  async createPatient(patientData: CreatePatient & { created_by: string; updated_by: string }): Promise<Patient> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      // Encrypt sensitive data
      const encryptedData = await this.encryptSensitiveData(patientData);

      const result = await transaction(async (client) => {
        const queryText = `
          INSERT INTO patients (
            id, hospital_id, medical_record_number, first_name, last_name,
            date_of_birth, gender, email, phone, address, emergency_contact,
            insurance_info, medical_history, allergies, current_medications,
            vital_signs, status, created_at, updated_at, created_by, updated_by,
            encrypted_data
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22
          ) RETURNING *
        `;

        const values = [
          id,
          patientData.hospital_id,
          patientData.medical_record_number,
          patientData.first_name,
          patientData.last_name,
          patientData.date_of_birth,
          patientData.gender,
          patientData.email,
          patientData.phone,
          JSON.stringify(patientData.address),
          JSON.stringify(patientData.emergency_contact),
          JSON.stringify(patientData.insurance_info),
          JSON.stringify(patientData.medical_history),
          JSON.stringify(patientData.allergies),
          JSON.stringify(patientData.current_medications),
          JSON.stringify(patientData.vital_signs),
          patientData.status || 'active',
          now,
          now,
          patientData.created_by,
          patientData.updated_by,
          encryptedData,
        ];

        const result = await client.query(queryText, values);
        return result.rows[0];
      });

      const patient = this.mapDbRowToPatient(result);

      // Publish patient created event
      await publishMessage('patient.created', {
        patientId: patient.id,
        hospitalId: patient.hospital_id,
        createdBy: patient.created_by,
        timestamp: now,
      });

      logDatabaseOperation('INSERT', 'patients', { id }, patient);

      return patient;
    } catch (error) {
      logger.error({ msg: 'Failed to create patient', error, patientData });
      throw error;
    }
  }

  async getPatientById(id: string): Promise<Patient | null> {
    try {
      // Check cache first
      const cacheKey = `${this.CACHE_PREFIX}${id}`;
      const cached = await getCache<Patient>(cacheKey);
      if (cached) {
        logger.debug({ msg: 'Patient retrieved from cache', patientId: id });
        return cached;
      }

      const result = await query(
        'SELECT * FROM patients WHERE id = $1 AND status != $2',
        [id, 'deleted']
      );

      if (result.rows.length === 0) {
        return null;
      }

      const patient = this.mapDbRowToPatient(result.rows[0]);

      // Cache the result
      await setCache(cacheKey, patient, this.CACHE_TTL);

      logDatabaseOperation('SELECT', 'patients', { id }, patient);

      return patient;
    } catch (error) {
      logger.error({ msg: 'Failed to get patient by ID', error, patientId: id });
      throw error;
    }
  }

  async updatePatient(
    id: string,
    updateData: UpdatePatient & { updated_by: string }
  ): Promise<Patient | null> {
    try {
      const now = new Date().toISOString();

      // Encrypt sensitive data if present
      const encryptedData = updateData ? await this.encryptSensitiveData(updateData) : null;

      const result = await transaction(async (client) => {
        let queryText = `
          UPDATE patients SET
            updated_at = $1,
            updated_by = $2
        `;
        const values = [now, updateData.updated_by];
        let paramIndex = 3;

        const updates: string[] = [];

        if (updateData.first_name !== undefined) {
          updates.push(`first_name = $${paramIndex}`);
          values.push(updateData.first_name);
          paramIndex++;
        }

        if (updateData.last_name !== undefined) {
          updates.push(`last_name = $${paramIndex}`);
          values.push(updateData.last_name);
          paramIndex++;
        }

        if (updateData.email !== undefined) {
          updates.push(`email = $${paramIndex}`);
          values.push(updateData.email);
          paramIndex++;
        }

        if (updateData.phone !== undefined) {
          updates.push(`phone = $${paramIndex}`);
          values.push(updateData.phone);
          paramIndex++;
        }

        if (updateData.address !== undefined) {
          updates.push(`address = $${paramIndex}`);
          values.push(JSON.stringify(updateData.address));
          paramIndex++;
        }

        if (updateData.emergency_contact !== undefined) {
          updates.push(`emergency_contact = $${paramIndex}`);
          values.push(JSON.stringify(updateData.emergency_contact));
          paramIndex++;
        }

        if (updateData.insurance_info !== undefined) {
          updates.push(`insurance_info = $${paramIndex}`);
          values.push(JSON.stringify(updateData.insurance_info));
          paramIndex++;
        }

        if (updateData.medical_history !== undefined) {
          updates.push(`medical_history = $${paramIndex}`);
          values.push(JSON.stringify(updateData.medical_history));
          paramIndex++;
        }

        if (updateData.allergies !== undefined) {
          updates.push(`allergies = $${paramIndex}`);
          values.push(JSON.stringify(updateData.allergies));
          paramIndex++;
        }

        if (updateData.current_medications !== undefined) {
          updates.push(`current_medications = $${paramIndex}`);
          values.push(JSON.stringify(updateData.current_medications));
          paramIndex++;
        }

        if (updateData.vital_signs !== undefined) {
          updates.push(`vital_signs = $${paramIndex}`);
          values.push(JSON.stringify(updateData.vital_signs));
          paramIndex++;
        }

        if (updateData.status !== undefined) {
          updates.push(`status = $${paramIndex}`);
          values.push(updateData.status);
          paramIndex++;
        }

        if (encryptedData) {
          updates.push(`encrypted_data = $${paramIndex}`);
          values.push(encryptedData);
          paramIndex++;
        }

        queryText += `, ${updates.join(', ')} WHERE id = $${paramIndex} AND status != 'deleted' RETURNING *`;
        values.push(id);

        const result = await client.query(queryText, values);
        return result.rows[0] || null;
      });

      if (!result) {
        return null;
      }

      const patient = this.mapDbRowToPatient(result);

      // Invalidate cache
      await deleteCache(`${this.CACHE_PREFIX}${id}`);

      // Publish patient updated event
      await publishMessage('patient.updated', {
        patientId: patient.id,
        hospitalId: patient.hospital_id,
        updatedBy: patient.updated_by,
        timestamp: now,
      });

      logDatabaseOperation('UPDATE', 'patients', { id }, patient);

      return patient;
    } catch (error) {
      logger.error({ msg: 'Failed to update patient', error, patientId: id, updateData });
      throw error;
    }
  }

  async deletePatient(id: string): Promise<boolean> {
    try {
      const result = await query(
        "UPDATE patients SET status = 'deleted', updated_at = $1 WHERE id = $2 AND status != 'deleted'",
        [new Date().toISOString(), id]
      );

      if (result.rowCount === 0) {
        return false;
      }

      // Invalidate cache
      await deleteCache(`${this.CACHE_PREFIX}${id}`);

      // Publish patient deleted event
      await publishMessage('patient.deleted', {
        patientId: id,
        timestamp: new Date().toISOString(),
      });

      logDatabaseOperation('UPDATE', 'patients', { id, status: 'deleted' });

      return true;
    } catch (error) {
      logger.error({ msg: 'Failed to delete patient', error, patientId: id });
      throw error;
    }
  }

  async searchPatients(searchParams: PatientSearch): Promise<{
    patients: Patient[];
    total: number;
    limit: number;
    offset: number;
  }> {
    try {
      const {
        hospital_id,
        medical_record_number,
        first_name,
        last_name,
        date_of_birth,
        email,
        phone,
        status,
        limit = 20,
        offset = 0,
        sort_by = 'created_at',
        sort_order = 'desc',
      } = searchParams;

      const conditions: string[] = ['status != $1'];
      const values: any[] = ['deleted'];
      let paramIndex = 2;

      if (hospital_id) {
        conditions.push(`hospital_id = $${paramIndex}`);
        values.push(hospital_id);
        paramIndex++;
      }

      if (medical_record_number) {
        conditions.push(`medical_record_number ILIKE $${paramIndex}`);
        values.push(`%${medical_record_number}%`);
        paramIndex++;
      }

      if (first_name) {
        conditions.push(`first_name ILIKE $${paramIndex}`);
        values.push(`%${first_name}%`);
        paramIndex++;
      }

      if (last_name) {
        conditions.push(`last_name ILIKE $${paramIndex}`);
        values.push(`%${last_name}%`);
        paramIndex++;
      }

      if (date_of_birth) {
        conditions.push(`date_of_birth = $${paramIndex}`);
        values.push(date_of_birth);
        paramIndex++;
      }

      if (email) {
        conditions.push(`email ILIKE $${paramIndex}`);
        values.push(`%${email}%`);
        paramIndex++;
      }

      if (phone) {
        conditions.push(`phone ILIKE $${paramIndex}`);
        values.push(`%${phone}%`);
        paramIndex++;
      }

      if (status) {
        conditions.push(`status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM patients ${whereClause}`;
      const countResult = await query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const sortColumn = this.mapSortColumn(sort_by);
      const dataQuery = `
        SELECT * FROM patients
        ${whereClause}
        ORDER BY ${sortColumn} ${sort_order.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);
      const dataResult = await query(dataQuery, values);

      const patients = dataResult.rows.map(row => this.mapDbRowToPatient(row));

      logDatabaseOperation('SELECT', 'patients', searchParams, { total, limit, offset });

      return {
        patients,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error({ msg: 'Failed to search patients', error, searchParams });
      throw error;
    }
  }

  private mapSortColumn(sortBy: string): string {
    const columnMap: { [key: string]: string } = {
      created_at: 'created_at',
      updated_at: 'updated_at',
      last_name: 'last_name',
      first_name: 'first_name',
    };
    return columnMap[sortBy] || 'created_at';
  }

  private mapDbRowToPatient(row: any): Patient {
    return {
      id: row.id,
      hospital_id: row.hospital_id,
      medical_record_number: row.medical_record_number,
      first_name: row.first_name,
      last_name: row.last_name,
      date_of_birth: row.date_of_birth,
      gender: row.gender,
      email: row.email,
      phone: row.phone,
      address: row.address ? JSON.parse(row.address) : undefined,
      emergency_contact: row.emergency_contact ? JSON.parse(row.emergency_contact) : undefined,
      insurance_info: row.insurance_info ? JSON.parse(row.insurance_info) : undefined,
      medical_history: row.medical_history ? JSON.parse(row.medical_history) : [],
      allergies: row.allergies ? JSON.parse(row.allergies) : [],
      current_medications: row.current_medications ? JSON.parse(row.current_medications) : [],
      vital_signs: row.vital_signs ? JSON.parse(row.vital_signs) : undefined,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    };
  }

  private async encryptSensitiveData(data: any): Promise<string | null> {
    // Identify sensitive fields that need encryption
    const sensitiveFields = ['ssn', 'medical_record_number', 'insurance_info'];

    const sensitiveData: any = {};
    let hasSensitiveData = false;

    for (const field of sensitiveFields) {
      if (data[field]) {
        sensitiveData[field] = data[field];
        hasSensitiveData = true;
      }
    }

    if (!hasSensitiveData) {
      return null;
    }

    return await encryptData(JSON.stringify(sensitiveData));
  }
}