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
import { WorkflowStateManager } from './workflowStateManager';

export class ClinicalService {
  private fastify?: FastifyInstance;
  private workflowStateManager: WorkflowStateManager;

  constructor(fastify?: FastifyInstance) {
    if (fastify) {
      this.fastify = fastify;
    }
    this.workflowStateManager = new WorkflowStateManager(fastify);
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

      // Get current state from state manager
      const currentState = await this.workflowStateManager.getWorkflowState(workflow.id);
      if (!currentState) {
        throw new Error('Workflow state not found');
      }

      // Update step status in state
      const updatedSteps = currentState.steps.map(step => {
        if (step.id === stepId) {
          return {
            ...step,
            status: status as any,
            completed_at: status === 'completed' ? new Date().toISOString() : step.completed_at,
            notes: notes || step.notes,
          };
        }
        return step;
      });

      // Determine new workflow state and current step
      let newWorkflowState = currentState.state;
      let newCurrentStep = currentState.current_step;

      if (status === 'in_progress') {
        newCurrentStep = stepId;
        if (currentState.state === 'pending') {
          newWorkflowState = 'in_progress';
        }
      }

      const allStepsCompleted = updatedSteps.every(step => step.status === 'completed');
      if (allStepsCompleted) {
        newWorkflowState = 'completed';
      }

      // Transition workflow state using state manager
      const newState = await this.workflowStateManager.transitionWorkflowState(
        workflow.id,
        newWorkflowState,
        newCurrentStep,
        userId,
        `Step ${stepId} updated to ${status}`,
        {
          step_update: {
            step_id: stepId,
            old_status: currentState.steps.find(s => s.id === stepId)?.status,
            new_status: status,
            notes
          }
        }
      );

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
            workflow_id: workflow.id,
            step_id: stepId,
            status,
            new_state: newWorkflowState,
            hospital_id: hospitalId,
          }),
        }],
      });

      logger.info('Workflow step updated with state management', {
        consultation_id: consultationId,
        workflow_id: workflow.id,
        step_id: stepId,
        status,
        new_state: newWorkflowState,
        hospital_id: hospitalId,
      });

      // Return updated workflow with latest state
      return {
        ...workflow,
        status: newWorkflowState,
        current_step: newCurrentStep,
        steps: updatedSteps,
        updated_at: new Date().toISOString()
      };
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

  // Clinical workflow CRUD methods
  async createClinicalWorkflow(
    data: CreateClinicalWorkflow,
    userId: string,
    hospitalId: string
  ): Promise<ClinicalWorkflow> {
    const pool = connectDatabase();
    const query = `
      INSERT INTO clinical_workflows (
        consultation_id, patient_id, hospital_id, workflow_type,
        status, priority, current_step, steps, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      data.consultation_id,
      data.patient_id,
      hospitalId,
      data.workflow_type,
      data.status,
      data.priority,
      data.current_step,
      JSON.stringify(data.steps),
      JSON.stringify(data.metadata || {}),
    ];

    const result = await pool.query(query, values);
    const workflow = result.rows[0];

    // Publish event
    const kafkaProducer = await getProducer();
    await kafkaProducer.send({
      topic: 'clinical-events',
      messages: [{
        key: workflow.id,
        value: JSON.stringify({
          event: 'clinical_workflow_created',
          workflow_id: workflow.id,
          consultation_id: data.consultation_id,
          hospital_id: hospitalId,
        }),
      }],
    });

    logger.info('Clinical workflow created', {
      workflow_id: workflow.id,
      consultation_id: data.consultation_id,
      hospital_id: hospitalId,
    });

    return workflow;
  }

  async getClinicalWorkflow(id: string, hospitalId: string): Promise<ClinicalWorkflow | null> {
    const pool = connectDatabase();
    const query = 'SELECT * FROM clinical_workflows WHERE id = $1 AND hospital_id = $2';
    const result = await pool.query(query, [id, hospitalId]);

    if (result.rows.length === 0) {
      return null;
    }

    const workflow = result.rows[0];
    workflow.steps = JSON.parse(workflow.steps);
    workflow.metadata = workflow.metadata ? JSON.parse(workflow.metadata) : {};

    return workflow;
  }

  async updateClinicalWorkflow(
    id: string,
    data: Partial<CreateClinicalWorkflow>,
    userId: string,
    hospitalId: string
  ): Promise<ClinicalWorkflow | null> {
    const pool = connectDatabase();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        values.push(data.status);
        paramIndex++;
      }

      if (data.priority !== undefined) {
        updates.push(`priority = $${paramIndex}`);
        values.push(data.priority);
        paramIndex++;
      }

      if (data.current_step !== undefined) {
        updates.push(`current_step = $${paramIndex}`);
        values.push(data.current_step);
        paramIndex++;
      }

      if (data.steps !== undefined) {
        updates.push(`steps = $${paramIndex}`);
        values.push(JSON.stringify(data.steps));
        paramIndex++;
      }

      if (data.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex}`);
        values.push(JSON.stringify(data.metadata));
        paramIndex++;
      }

      updates.push(`updated_at = NOW()`);

      const whereClause = `WHERE id = $${paramIndex} AND hospital_id = $${paramIndex + 1}`;
      values.push(id, hospitalId);

      const query = `UPDATE clinical_workflows SET ${updates.join(', ')} ${whereClause} RETURNING *`;
      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const workflow = result.rows[0];
      workflow.steps = JSON.parse(workflow.steps);
      workflow.metadata = workflow.metadata ? JSON.parse(workflow.metadata) : {};

      // Publish event
      const kafkaProducer = await getProducer();
      await kafkaProducer.send({
        topic: 'clinical-events',
        messages: [{
          key: workflow.id,
          value: JSON.stringify({
            event: 'clinical_workflow_updated',
            workflow_id: workflow.id,
            consultation_id: workflow.consultation_id,
            hospital_id: hospitalId,
          }),
        }],
      });

      await client.query('COMMIT');

      logger.info('Clinical workflow updated', {
        workflow_id: workflow.id,
        consultation_id: workflow.consultation_id,
        hospital_id: hospitalId,
      });

      return workflow;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update clinical workflow', { error, workflow_id: id });
      throw error;
    } finally {
      client.release();
    }
  }

  async searchClinicalWorkflows(
    search: ClinicalWorkflowSearch,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ workflows: ClinicalWorkflow[]; total: number }> {
    const conditions: string[] = ['hospital_id = $1'];
    const values: any[] = [search.hospital_id];
    let paramIndex = 2;

    if (search.patient_id) {
      conditions.push(`patient_id = $${paramIndex}`);
      values.push(search.patient_id);
      paramIndex++;
    }

    if (search.status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(search.status);
      paramIndex++;
    }

    if (search.workflow_type) {
      conditions.push(`workflow_type = $${paramIndex}`);
      values.push(search.workflow_type);
      paramIndex++;
    }

    if (search.priority) {
      conditions.push(`priority = $${paramIndex}`);
      values.push(search.priority);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const pool = connectDatabase();
    const countQuery = `SELECT COUNT(*) FROM clinical_workflows WHERE ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const dataQuery = `
      SELECT * FROM clinical_workflows
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);
    const result = await pool.query(dataQuery, values);

    const workflows = result.rows.map(row => ({
      ...row,
      steps: JSON.parse(row.steps),
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    }));

    return { workflows, total };
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

  // Advanced Workflow State Management Methods

  async getWorkflowState(workflowId: string): Promise<any> {
    return await this.workflowStateManager.getWorkflowState(workflowId);
  }

  async transitionWorkflowState(
    workflowId: string,
    newState: string,
    newCurrentStep: string,
    userId: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<any> {
    const pool = connectDatabase();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get workflow to validate hospital access
      const workflowQuery = 'SELECT hospital_id FROM clinical_workflows WHERE id = $1';
      const workflowResult = await client.query(workflowQuery, [workflowId]);

      if (workflowResult.rows.length === 0) {
        throw new Error('Workflow not found');
      }

      // Transition state using state manager
      const newStateRecord = await this.workflowStateManager.transitionWorkflowState(
        workflowId,
        newState,
        newCurrentStep,
        userId,
        reason,
        metadata
      );

      await client.query('COMMIT');

      logger.info('Workflow state transitioned', {
        workflow_id: workflowId,
        from_state: newStateRecord.state,
        to_state: newState,
        user_id: userId
      });

      return newStateRecord;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to transition workflow state', { error, workflow_id: workflowId });
      throw error;
    } finally {
      client.release();
    }
  }

  async getWorkflowHistory(workflowId: string, limit: number = 50): Promise<any[]> {
    return await this.workflowStateManager.getWorkflowHistory(workflowId, limit);
  }

  async recoverWorkflowState(
    workflowId: string,
    targetVersion: number,
    userId: string,
    reason: string
  ): Promise<any> {
    const pool = connectDatabase();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get workflow to validate hospital access
      const workflowQuery = 'SELECT hospital_id FROM clinical_workflows WHERE id = $1';
      const workflowResult = await client.query(workflowQuery, [workflowId]);

      if (workflowResult.rows.length === 0) {
        throw new Error('Workflow not found');
      }

      // Recover state using state manager
      const recoveredState = await this.workflowStateManager.recoverWorkflowState(
        workflowId,
        targetVersion,
        userId,
        reason
      );

      await client.query('COMMIT');

      logger.info('Workflow state recovered', {
        workflow_id: workflowId,
        target_version: targetVersion,
        recovered_version: recoveredState.version,
        user_id: userId
      });

      return recoveredState;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to recover workflow state', { error, workflow_id: workflowId });
      throw error;
    } finally {
      client.release();
    }
  }

  async validateWorkflowStateIntegrity(workflowId: string): Promise<boolean> {
    const pool = connectDatabase();
    const query = `
      SELECT id FROM workflow_states
      WHERE workflow_id = $1
      ORDER BY version DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [workflowId]);

    if (result.rows.length === 0) {
      return false;
    }

    // Use the database function to validate checksum
    const validateQuery = 'SELECT validate_workflow_state_checksum($1) as is_valid';
    const validateResult = await pool.query(validateQuery, [result.rows[0].id]);

    return validateResult.rows[0].is_valid;
  }

  async getWorkflowStateStatistics(workflowId: string): Promise<{
    total_versions: number;
    current_version: number;
    state_changes: number;
    last_modified: string;
    integrity_valid: boolean;
  }> {
    const pool = connectDatabase();

    const statsQuery = `
      SELECT
        COUNT(*) as total_versions,
        MAX(version) as current_version,
        COUNT(DISTINCT state) - 1 as state_changes,
        MAX(created_at) as last_modified
      FROM workflow_states
      WHERE workflow_id = $1
    `;

    const statsResult = await pool.query(statsQuery, [workflowId]);
    const stats = statsResult.rows[0];

    const integrityValid = await this.validateWorkflowStateIntegrity(workflowId);

    return {
      total_versions: parseInt(stats.total_versions),
      current_version: parseInt(stats.current_version),
      state_changes: parseInt(stats.state_changes),
      last_modified: stats.last_modified,
      integrity_valid: integrityValid
    };
  }
}