import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  Consultation,
  CreateConsultation,
  UpdateConsultation,
  ClinicalWorkflow,
  CreateClinicalWorkflow,
  MedicalRecord,
  CreateMedicalRecord,
  ClinicalDecisionSupport,
  ConsultationSearch,
  ClinicalWorkflowSearch,
  MedicalRecordSearch,
} from '../types/clinical';
import { encryptData, decryptData } from '../utils/encryption';
import { logger } from '../utils/logger';
import { connectDatabase } from '../config/database';
import { connectRedis } from '../config/redis';
import { getProducer } from '../config/kafka';

export class ClinicalService {
  private fastify?: FastifyInstance;

  constructor(fastify?: FastifyInstance) {
    if (fastify) {
      this.fastify = fastify;
    }
  }

  // Consultation methods
  async createConsultation(
    data: CreateConsultation,
    userId: string,
    hospitalId: string
  ): Promise<Consultation> {
    const pool = connectDatabase();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Encrypt sensitive data
      const encryptedChiefComplaint = await encryptData(data.chief_complaint);
      const encryptedHistory = data.history_of_present_illness
        ? await encryptData(data.history_of_present_illness)
        : null;
      const encryptedPhysicalExam = data.physical_examination
        ? await encryptData(data.physical_examination)
        : null;
      const encryptedAssessment = data.assessment
        ? await encryptData(data.assessment)
        : null;
      const encryptedPlan = data.plan
        ? await encryptData(data.plan)
        : null;
      const encryptedProgressNotes = data.progress_notes
        ? await encryptData(data.progress_notes)
        : null;
      const encryptedClinicalNotes = data.clinical_notes
        ? await encryptData(data.clinical_notes)
        : null;

      const query = `
        INSERT INTO consultations (
          patient_id, provider_id, appointment_id, hospital_id,
          consultation_type, status, chief_complaint, history_of_present_illness,
          vital_signs, physical_examination, assessment, plan,
          diagnosis_codes, procedure_codes, medications_prescribed,
          lab_orders, imaging_orders, follow_up_instructions,
          progress_notes, clinical_notes, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *
      `;

      const values = [
        data.patient_id,
        data.provider_id,
        data.appointment_id || null,
        hospitalId,
        data.consultation_type,
        data.status,
        encryptedChiefComplaint,
        encryptedHistory,
        JSON.stringify(data.vital_signs || {}),
        encryptedPhysicalExam,
        encryptedAssessment,
        encryptedPlan,
        JSON.stringify(data.diagnosis_codes || []),
        JSON.stringify(data.procedure_codes || []),
        JSON.stringify(data.medications_prescribed || []),
        JSON.stringify(data.lab_orders || []),
        JSON.stringify(data.imaging_orders || []),
        data.follow_up_instructions || null,
        encryptedProgressNotes,
        encryptedClinicalNotes,
        userId,
        userId,
      ];

      const result = await client.query(query, values);
      const consultation = result.rows[0];

      // Create initial workflow
      await this.createInitialWorkflow(consultation.id, data.patient_id, hospitalId, userId, client);

      // Publish event
      const kafkaProducer = await getProducer();
      await kafkaProducer.send({
        topic: 'clinical-events',
        messages: [{
          key: consultation.id,
          value: JSON.stringify({
            event: 'consultation_created',
            consultation_id: consultation.id,
            patient_id: data.patient_id,
            hospital_id: hospitalId,
          }),
        }],
      });

      await client.query('COMMIT');

      // Cache consultation
      const redis = await connectRedis();
      await redis.setEx(
        `consultation:${consultation.id}`,
        3600, // 1 hour
        JSON.stringify(consultation)
      );

      logger.info('Consultation created', {
        consultation_id: consultation.id,
        patient_id: data.patient_id,
        hospital_id: hospitalId,
      });

      return this.decryptConsultationFields(consultation);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create consultation', { error, patient_id: data.patient_id });
      throw error;
    } finally {
      client.release();
    }
  }

  async getConsultation(id: string, hospitalId: string): Promise<Consultation | null> {
    // Check cache first
    const redis = await connectRedis();
    const cached = await redis.get(`consultation:${id}`);
    if (cached) {
      const consultation = JSON.parse(cached);
      if (consultation.hospital_id === hospitalId) {
        return this.decryptConsultationFields(consultation);
      }
    }

    const pool = connectDatabase();
    const query = 'SELECT * FROM consultations WHERE id = $1 AND hospital_id = $2';
    const result = await pool.query(query, [id, hospitalId]);

    if (result.rows.length === 0) {
      return null;
    }

    const consultation = result.rows[0];

    // Cache result
    await redis.setEx(`consultation:${id}`, 3600, JSON.stringify(consultation));

    return this.decryptConsultationFields(consultation);
  }

  async updateConsultation(
    id: string,
    data: UpdateConsultation,
    userId: string,
    hospitalId: string
  ): Promise<Consultation | null> {
    const pool = connectDatabase();
    const client = await pool.connect();
    const redis = await connectRedis();

    try {
      await client.query('BEGIN');

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const fieldsToEncrypt = [
        'chief_complaint',
        'history_of_present_illness',
        'physical_examination',
        'assessment',
        'plan',
        'progress_notes',
        'clinical_notes',
      ];

      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          if (fieldsToEncrypt.includes(key)) {
            updates.push(`${key} = $${paramIndex}`);
            values.push(await encryptData(value as string));
          } else if (key === 'vital_signs' || key === 'diagnosis_codes' || key === 'procedure_codes' ||
                     key === 'medications_prescribed' || key === 'lab_orders' || key === 'imaging_orders') {
            updates.push(`${key} = $${paramIndex}`);
            values.push(JSON.stringify(value));
          } else {
            updates.push(`${key} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        }
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push(`updated_at = NOW()`, `updated_by = $${paramIndex}`);
      values.push(userId);
      paramIndex++;

      values.push(id, hospitalId);

      const query = `
        UPDATE consultations
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex - 1} AND hospital_id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const consultation = result.rows[0];

      // Update workflow if status changed
      if (data.status) {
        await this.updateWorkflowStatus(consultation.id, data.status, userId, client);
      }

      // Publish event
      const kafkaProducer = await getProducer();
      await kafkaProducer.send({
        topic: 'clinical-events',
        messages: [{
          key: consultation.id,
          value: JSON.stringify({
            event: 'consultation_updated',
            consultation_id: consultation.id,
            patient_id: consultation.patient_id,
            hospital_id: hospitalId,
          }),
        }],
      });

      await client.query('COMMIT');

      // Update cache
      await redis.setEx(`consultation:${id}`, 3600, JSON.stringify(consultation));

      logger.info('Consultation updated', { consultation_id: id, hospital_id: hospitalId });

      return this.decryptConsultationFields(consultation);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update consultation', { error, consultation_id: id });
      throw error;
    } finally {
      client.release();
    }
  }

  async searchConsultations(
    search: ConsultationSearch,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ consultations: Consultation[]; total: number }> {
    const conditions: string[] = ['hospital_id = $1'];
    const values: any[] = [search.hospital_id];
    let paramIndex = 2;

    if (search.patient_id) {
      conditions.push(`patient_id = $${paramIndex}`);
      values.push(search.patient_id);
      paramIndex++;
    }

    if (search.provider_id) {
      conditions.push(`provider_id = $${paramIndex}`);
      values.push(search.provider_id);
      paramIndex++;
    }

    if (search.status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(search.status);
      paramIndex++;
    }

    if (search.consultation_type) {
      conditions.push(`consultation_type = $${paramIndex}`);
      values.push(search.consultation_type);
      paramIndex++;
    }

    if (search.date_from) {
      conditions.push(`created_at >= $${paramIndex}`);
      values.push(search.date_from);
      paramIndex++;
    }

    if (search.date_to) {
      conditions.push(`created_at <= $${paramIndex}`);
      values.push(search.date_to);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const pool = connectDatabase();
    const countQuery = `SELECT COUNT(*) FROM consultations WHERE ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const dataQuery = `
      SELECT * FROM consultations
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);
    const result = await pool.query(dataQuery, values);

    const consultations = await Promise.all(result.rows.map(row => this.decryptConsultationFields(row)));

    return { consultations, total };
  }

  // Clinical workflow methods
  private async createInitialWorkflow(
    consultationId: string,
    patientId: string,
    hospitalId: string,
    userId: string,
    client: any
  ): Promise<void> {
    const workflowData: CreateClinicalWorkflow = {
      consultation_id: consultationId,
      patient_id: patientId,
      hospital_id: hospitalId,
      workflow_type: 'consultation',
      status: 'pending',
      priority: 'medium',
      current_step: 'assessment',
      steps: [
        {
          id: 'assessment',
          name: 'Patient Assessment',
          status: 'in_progress',
          assigned_to: userId,
        },
        {
          id: 'diagnosis',
          name: 'Diagnosis',
          status: 'pending',
        },
        {
          id: 'treatment_plan',
          name: 'Treatment Plan',
          status: 'pending',
        },
        {
          id: 'follow_up',
          name: 'Follow Up',
          status: 'pending',
        },
      ],
    };

    const query = `
      INSERT INTO clinical_workflows (
        consultation_id, patient_id, hospital_id, workflow_type,
        status, priority, current_step, steps
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await client.query(query, [
      workflowData.consultation_id,
      workflowData.patient_id,
      workflowData.hospital_id,
      workflowData.workflow_type,
      workflowData.status,
      workflowData.priority,
      workflowData.current_step,
      JSON.stringify(workflowData.steps),
    ]);
  }

  private async updateWorkflowStatus(
    consultationId: string,
    consultationStatus: string,
    userId: string,
    client: any
  ): Promise<void> {
    let workflowStatus: string;
    let currentStep: string;

    switch (consultationStatus) {
      case 'scheduled':
        workflowStatus = 'pending';
        currentStep = 'assessment';
        break;
      case 'in-progress':
        workflowStatus = 'in_progress';
        currentStep = 'diagnosis';
        break;
      case 'completed':
        workflowStatus = 'completed';
        currentStep = 'follow_up';
        break;
      case 'cancelled':
        workflowStatus = 'cancelled';
        currentStep = 'cancelled';
        break;
      default:
        return;
    }

    const query = `
      UPDATE clinical_workflows
      SET status = $1, current_step = $2, updated_at = NOW()
      WHERE consultation_id = $3
    `;

    await client.query(query, [workflowStatus, currentStep, consultationId]);
  }

  async getWorkflow(consultationId: string, hospitalId: string): Promise<ClinicalWorkflow | null> {
    const pool = connectDatabase();
    const query = `
      SELECT * FROM clinical_workflows
      WHERE consultation_id = $1 AND hospital_id = $2
    `;
    const result = await pool.query(query, [consultationId, hospitalId]);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async updateWorkflowStep(
    consultationId: string,
    stepId: string,
    status: string,
    userId: string,
    hospitalId: string,
    notes?: string
  ): Promise<ClinicalWorkflow | null> {
    const pool = connectDatabase();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get current workflow
      const workflow = await this.getWorkflow(consultationId, hospitalId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Update step status
      const updatedSteps = workflow.steps.map(step => {
        if (step.id === stepId) {
          return {
            ...step,
            status,
            completed_at: status === 'completed' ? new Date().toISOString() : step.completed_at,
            notes: notes || step.notes,
          };
        }
        return step;
      });

      // Update current step if this step is now in progress
      let currentStep = workflow.current_step;
      if (status === 'in_progress') {
        currentStep = stepId;
      }

      // Update workflow status
      let workflowStatus = workflow.status;
      const allStepsCompleted = updatedSteps.every(step => step.status === 'completed');
      if (allStepsCompleted) {
        workflowStatus = 'completed';
      } else if (updatedSteps.some(step => step.status === 'in_progress')) {
        workflowStatus = 'in_progress';
      }

      const query = `
        UPDATE clinical_workflows
        SET steps = $1, current_step = $2, status = $3, updated_at = NOW()
        WHERE consultation_id = $4 AND hospital_id = $5
        RETURNING *
      `;

      const result = await client.query(query, [
        JSON.stringify(updatedSteps),
        currentStep,
        workflowStatus,
        consultationId,
        hospitalId,
      ]);

      await client.query('COMMIT');

      // Publish event
      const kafkaProducer = await getProducer();
      await kafkaProducer.send({
        topic: 'clinical-events',
        messages: [{
          key: consultationId,
          value: JSON.stringify({
            event: 'workflow_step_updated',
            consultation_id: consultationId,
            step_id: stepId,
            status,
            hospital_id: hospitalId,
          }),
        }],
      });

      logger.info('Workflow step updated', {
        consultation_id: consultationId,
        step_id: stepId,
        status,
        hospital_id: hospitalId,
      });

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update workflow step', { error, consultation_id: consultationId });
      throw error;
    } finally {
      client.release();
    }
  }

  // Medical record methods
  async createMedicalRecord(
    data: CreateMedicalRecord,
    userId: string
  ): Promise<MedicalRecord> {
    const pool = connectDatabase();
    const encryptedContent = await encryptData(data.content);

    const query = `
      INSERT INTO medical_records (
        patient_id, hospital_id, record_type, record_date, provider_id,
        title, content, attachments, tags, is_confidential
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      data.patient_id,
      data.hospital_id,
      data.record_type,
      data.record_date,
      data.provider_id,
      data.title,
      encryptedContent,
      JSON.stringify(data.attachments || []),
      JSON.stringify(data.tags || []),
      data.is_confidential || false,
    ];

    const result = await pool.query(query, values);
    const record = result.rows[0];

    // Publish event
    const kafkaProducer = await getProducer();
    await kafkaProducer.send({
      topic: 'clinical-events',
      messages: [{
        key: record.id,
        value: JSON.stringify({
          event: 'medical_record_created',
          record_id: record.id,
          patient_id: data.patient_id,
          record_type: data.record_type,
          hospital_id: data.hospital_id,
        }),
      }],
    });

    logger.info('Medical record created', {
      record_id: record.id,
      patient_id: data.patient_id,
      record_type: data.record_type,
    });

    return this.decryptMedicalRecordFields(record);
  }

  async getMedicalRecord(id: string, hospitalId: string): Promise<MedicalRecord | null> {
    const pool = connectDatabase();
    const query = 'SELECT * FROM medical_records WHERE id = $1 AND hospital_id = $2';
    const result = await pool.query(query, [id, hospitalId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.decryptMedicalRecordFields(result.rows[0]);
  }

  async searchMedicalRecords(
    search: MedicalRecordSearch,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ records: MedicalRecord[]; total: number }> {
    const conditions: string[] = ['hospital_id = $1'];
    const values: any[] = [search.hospital_id];
    let paramIndex = 2;

    if (search.patient_id) {
      conditions.push(`patient_id = $${paramIndex}`);
      values.push(search.patient_id);
      paramIndex++;
    }

    if (search.record_type) {
      conditions.push(`record_type = $${paramIndex}`);
      values.push(search.record_type);
      paramIndex++;
    }

    if (search.date_from) {
      conditions.push(`record_date >= $${paramIndex}`);
      values.push(search.date_from);
      paramIndex++;
    }

    if (search.date_to) {
      conditions.push(`record_date <= $${paramIndex}`);
      values.push(search.date_to);
      paramIndex++;
    }

    if (search.tags && search.tags.length > 0) {
      conditions.push(`tags && $${paramIndex}`);
      values.push(JSON.stringify(search.tags));
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const pool = connectDatabase();
    const countQuery = `SELECT COUNT(*) FROM medical_records WHERE ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const dataQuery = `
      SELECT * FROM medical_records
      WHERE ${whereClause}
      ORDER BY record_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);
    const result = await pool.query(dataQuery, values);

    const records = await Promise.all(result.rows.map(row => this.decryptMedicalRecordFields(row)));

    return { records, total };
  }

  // Clinical decision support
  async getClinicalAlerts(
    patientId: string,
    hospitalId: string,
    consultationId?: string
  ): Promise<ClinicalDecisionSupport[]> {
    const pool = connectDatabase();
    const query = `
      SELECT * FROM clinical_decision_support
      WHERE patient_id = $1 AND hospital_id = $2
      AND (consultation_id = $3 OR $3 IS NULL)
      AND is_acknowledged = false
      ORDER BY severity DESC, created_at DESC
    `;

    const result = await pool.query(query, [patientId, hospitalId, consultationId || null]);
    return result.rows;
  }

  async acknowledgeAlert(
    alertId: string,
    userId: string,
    hospitalId: string
  ): Promise<boolean> {
    const pool = connectDatabase();
    const query = `
      UPDATE clinical_decision_support
      SET is_acknowledged = true, acknowledged_by = $1, acknowledged_at = NOW()
      WHERE id = $2 AND hospital_id = $3
      RETURNING id
    `;

    const result = await pool.query(query, [userId, alertId, hospitalId]);
    return result.rows.length > 0;
  }

  // Helper methods for decryption
  private async decryptConsultationFields(consultation: any): Promise<Consultation> {
    return {
      ...consultation,
      chief_complaint: await decryptData(consultation.chief_complaint),
      history_of_present_illness: consultation.history_of_present_illness
        ? await decryptData(consultation.history_of_present_illness)
        : undefined,
      physical_examination: consultation.physical_examination
        ? await decryptData(consultation.physical_examination)
        : undefined,
      assessment: consultation.assessment
        ? await decryptData(consultation.assessment)
        : undefined,
      plan: consultation.plan
        ? await decryptData(consultation.plan)
        : undefined,
      progress_notes: consultation.progress_notes
        ? await decryptData(consultation.progress_notes)
        : undefined,
      clinical_notes: consultation.clinical_notes
        ? await decryptData(consultation.clinical_notes)
        : undefined,
      vital_signs: consultation.vital_signs ? JSON.parse(consultation.vital_signs) : undefined,
      diagnosis_codes: consultation.diagnosis_codes ? JSON.parse(consultation.diagnosis_codes) : undefined,
      procedure_codes: consultation.procedure_codes ? JSON.parse(consultation.procedure_codes) : undefined,
      medications_prescribed: consultation.medications_prescribed ? JSON.parse(consultation.medications_prescribed) : undefined,
      lab_orders: consultation.lab_orders ? JSON.parse(consultation.lab_orders) : undefined,
      imaging_orders: consultation.imaging_orders ? JSON.parse(consultation.imaging_orders) : undefined,
    };
  }

  private async decryptMedicalRecordFields(record: any): Promise<MedicalRecord> {
    return {
      ...record,
      content: await decryptData(record.content),
      attachments: record.attachments ? JSON.parse(record.attachments) : undefined,
      tags: record.tags ? JSON.parse(record.tags) : undefined,
    };
  }
}