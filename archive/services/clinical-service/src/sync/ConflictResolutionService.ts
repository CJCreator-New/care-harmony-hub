import { FastifyInstance } from 'fastify';
import { connectDatabase } from '../config/database';

interface ConflictRecord {
  id: string;
  record_id: string;
  record_type: string;
  conflict_type: string;
  main_data: any;
  microservice_data: any;
  detected_at: Date;
  status: 'pending' | 'resolved' | 'escalated';
  resolution_strategy?: string;
  resolved_at?: Date;
  resolved_by?: string;
}

interface ResolutionResult {
  success: boolean;
  strategy: string;
  resolvedData: any;
  auditLog: string;
}

export class ConflictResolutionService {
  constructor(private fastify: FastifyInstance) {}

  async resolveConflict(conflictId: string, strategy: string, resolvedData?: any): Promise<ResolutionResult> {
    const conflict = await this.getConflict(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    let result: ResolutionResult;

    switch (strategy) {
      case 'main_wins':
        result = await this.resolveMainWins(conflict);
        break;
      case 'microservice_wins':
        result = await this.resolveMicroserviceWins(conflict);
        break;
      case 'merge':
        result = await this.resolveMerge(conflict);
        break;
      case 'manual':
        if (!resolvedData) {
          throw new Error('Manual resolution requires resolved data');
        }
        result = await this.resolveManual(conflict, resolvedData);
        break;
      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`);
    }

    await this.updateConflictStatus(conflictId, 'resolved', strategy, result.auditLog);
    await this.logResolution(conflict, result);

    return result;
  }

  async escalateConflict(conflictId: string, reason: string): Promise<void> {
    const conflict = await this.getConflict(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    await this.updateConflictStatus(conflictId, 'escalated', 'escalated', reason);

    // Send notification to administrators
    await this.notifyAdministrators(conflict, reason);

    this.fastify.log.info(`Conflict ${conflictId} escalated: ${reason}`);
  }

  async getPendingConflicts(): Promise<ConflictRecord[]> {
    const pool = connectDatabase();
    const result = await pool.query(`
      SELECT * FROM sync_conflicts
      WHERE status = 'pending'
      ORDER BY detected_at DESC
    `);
    return result.rows.map(row => ({
      ...row,
      main_data: JSON.parse(row.main_data),
      microservice_data: JSON.parse(row.microservice_data)
    }));
  }

  async getConflict(conflictId: string): Promise<ConflictRecord | null> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM sync_conflicts WHERE id = $1', [conflictId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      main_data: JSON.parse(row.main_data),
      microservice_data: JSON.parse(row.microservice_data)
    };
  }

  async getConflictStatistics(): Promise<{
    totalConflicts: number;
    pendingConflicts: number;
    resolvedConflicts: number;
    escalatedConflicts: number;
    averageResolutionTime: number;
  }> {
    const pool = connectDatabase();
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_conflicts,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_conflicts,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_conflicts,
        COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalated_conflicts,
        AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at))) as avg_resolution_time_seconds
      FROM sync_conflicts
    `);

    const stats = result.rows[0];
    return {
      totalConflicts: parseInt(stats.total_conflicts),
      pendingConflicts: parseInt(stats.pending_conflicts),
      resolvedConflicts: parseInt(stats.resolved_conflicts),
      escalatedConflicts: parseInt(stats.escalated_conflicts),
      averageResolutionTime: parseFloat(stats.avg_resolution_time_seconds) || 0
    };
  }

  async autoResolveConflicts(): Promise<{ resolved: number; failed: number }> {
    const pendingConflicts = await this.getPendingConflicts();
    let resolved = 0;
    let failed = 0;

    for (const conflict of pendingConflicts) {
      try {
        // Auto-resolve based on simple rules
        let strategy = 'main_wins'; // Default strategy

        // If main data is significantly newer, prefer main
        const mainTime = new Date(conflict.main_data.updated_at || conflict.main_data.created_at).getTime();
        const microTime = new Date(conflict.microservice_data.updated_at || conflict.microservice_data.created_at).getTime();
        const timeDiff = Math.abs(mainTime - microTime);

        if (timeDiff < 5 * 60 * 1000) { // Less than 5 minutes difference
          strategy = 'merge'; // Try to merge if timestamps are close
        }

        await this.resolveConflict(conflict.id, strategy);
        resolved++;
      } catch (error) {
        this.fastify.log.error({
          msg: 'Auto-resolution failed for conflict',
          conflictId: conflict.id,
          error
        });
        failed++;
      }
    }

    return { resolved, failed };
  }

  // Private resolution strategies
  private async resolveMainWins(conflict: ConflictRecord): Promise<ResolutionResult> {
    const resolvedData = conflict.main_data;
    await this.updateRecordInMicroservice(conflict.record_type, resolvedData);

    return {
      success: true,
      strategy: 'main_wins',
      resolvedData,
      auditLog: `Resolved by accepting main database data for ${conflict.record_type} ${conflict.record_id}`
    };
  }

  private async resolveMicroserviceWins(conflict: ConflictRecord): Promise<ResolutionResult> {
    const resolvedData = conflict.microservice_data;
    // Note: In a real implementation, this would also update the main database

    return {
      success: true,
      strategy: 'microservice_wins',
      resolvedData,
      auditLog: `Resolved by accepting microservice data for ${conflict.record_type} ${conflict.record_id}`
    };
  }

  private async resolveMerge(conflict: ConflictRecord): Promise<ResolutionResult> {
    const mainData = conflict.main_data;
    const microData = conflict.microservice_data;

    // Intelligent merge logic based on record type
    let resolvedData: any;

    switch (conflict.record_type) {
      case 'consultation':
        resolvedData = this.mergeConsultationData(mainData, microData);
        break;
      case 'clinical_workflow':
        resolvedData = this.mergeWorkflowData(mainData, microData);
        break;
      case 'medical_record':
        resolvedData = this.mergeMedicalRecordData(mainData, microData);
        break;
      case 'clinical_decision_support':
        resolvedData = this.mergeCDSData(mainData, microData);
        break;
      default:
        resolvedData = mainData; // Default to main data
    }

    await this.updateRecordInMicroservice(conflict.record_type, resolvedData);

    return {
      success: true,
      strategy: 'merge',
      resolvedData,
      auditLog: `Resolved by merging data for ${conflict.record_type} ${conflict.record_id}`
    };
  }

  private async resolveManual(conflict: ConflictRecord, resolvedData: any): Promise<ResolutionResult> {
    // Validate the resolved data
    await this.validateResolvedData(conflict.record_type, resolvedData);

    await this.updateRecordInMicroservice(conflict.record_type, resolvedData);

    return {
      success: true,
      strategy: 'manual',
      resolvedData,
      auditLog: `Resolved manually for ${conflict.record_type} ${conflict.record_id}`
    };
  }

  private async updateRecordInMicroservice(recordType: string, data: any): Promise<void> {
    const pool = connectDatabase();

    switch (recordType) {
      case 'consultation':
        await pool.query(`
          UPDATE consultations
          SET status = $2, assessment = $3, plan = $4, progress_notes = $5, clinical_notes = $6, completed_at = $7, updated_at = $8, updated_by = $9
          WHERE id = $1
        `, [data.id, data.status, data.assessment, data.plan, data.progress_notes, data.clinical_notes, data.completed_at, data.updated_at, data.updated_by]);
        break;

      case 'clinical_workflow':
        await pool.query(`
          UPDATE clinical_workflows
          SET status = $2, current_step = $3, steps = $4, updated_at = $5
          WHERE id = $1
        `, [data.id, data.status, data.current_step, JSON.stringify(data.steps), data.updated_at]);
        break;

      case 'medical_record':
        await pool.query(`
          UPDATE medical_records
          SET title = $2, content = $3, attachments = $4, tags = $5, updated_at = $6
          WHERE id = $1
        `, [data.id, data.title, data.content, JSON.stringify(data.attachments), JSON.stringify(data.tags), data.updated_at]);
        break;

      case 'clinical_decision_support':
        await pool.query(`
          UPDATE clinical_decision_support
          SET is_acknowledged = $2, acknowledged_by = $3, acknowledged_at = $4
          WHERE id = $1
        `, [data.id, data.is_acknowledged, data.acknowledged_by, data.acknowledged_at]);
        break;
    }
  }

  private async updateConflictStatus(
    conflictId: string,
    status: 'resolved' | 'escalated',
    strategy: string,
    auditLog: string
  ): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE sync_conflicts
      SET status = $2, resolution_strategy = $3, resolved_at = NOW(), resolved_by = 'system'
      WHERE id = $1
    `, [conflictId, status, strategy]);
  }

  private async logResolution(conflict: ConflictRecord, result: ResolutionResult): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO sync_audit_log (id, record_id, record_type, action, details, performed_at, performed_by)
      VALUES (gen_random_uuid(), $1, $2, 'conflict_resolution', $3, NOW(), 'system')
    `, [conflict.record_id, conflict.record_type, JSON.stringify({
      strategy: result.strategy,
      auditLog: result.auditLog,
      conflictId: conflict.id
    })]);
  }

  private async notifyAdministrators(conflict: ConflictRecord, reason: string): Promise<void> {
    // This would integrate with the notification system
    // For now, just log the escalation
    this.fastify.log.warn({
      msg: 'Conflict escalated - administrator notification needed',
      conflictId: conflict.id,
      recordId: conflict.record_id,
      recordType: conflict.record_type,
      reason
    });
  }

  // Merge logic for different record types
  private mergeConsultationData(mainData: any, microData: any): any {
    return {
      ...mainData,
      // Prefer more recent status updates
      status: mainData.updated_at > microData.updated_at ? mainData.status : microData.status,
      // Merge notes if they differ
      progress_notes: this.mergeNotes(mainData.progress_notes, microData.progress_notes),
      clinical_notes: this.mergeNotes(mainData.clinical_notes, microData.clinical_notes),
      // Use the most recent update timestamp
      updated_at: new Date(Math.max(new Date(mainData.updated_at).getTime(), new Date(microData.updated_at).getTime())).toISOString(),
      updated_by: mainData.updated_at > microData.updated_at ? mainData.updated_by : microData.updated_by
    };
  }

  private mergeWorkflowData(mainData: any, microData: any): any {
    return {
      ...mainData,
      // Prefer more recent status
      status: mainData.updated_at > microData.updated_at ? mainData.status : microData.status,
      // Merge steps intelligently
      steps: this.mergeWorkflowSteps(mainData.steps, microData.steps),
      // Use the most recent update timestamp
      updated_at: new Date(Math.max(new Date(mainData.updated_at).getTime(), new Date(microData.updated_at).getTime())).toISOString()
    };
  }

  private mergeMedicalRecordData(mainData: any, microData: any): any {
    return {
      ...mainData,
      // Merge content if different
      content: mainData.updated_at > microData.updated_at ? mainData.content : microData.content,
      // Combine tags
      tags: [...new Set([...(mainData.tags || []), ...(microData.tags || [])])],
      // Use the most recent update timestamp
      updated_at: new Date(Math.max(new Date(mainData.updated_at).getTime(), new Date(microData.updated_at).getTime())).toISOString()
    };
  }

  private mergeCDSData(mainData: any, microData: any): any {
    return {
      ...mainData,
      // Prefer acknowledged status
      is_acknowledged: mainData.is_acknowledged || microData.is_acknowledged,
      acknowledged_by: mainData.acknowledged_by || microData.acknowledged_by,
      acknowledged_at: mainData.acknowledged_at || microData.acknowledged_at
    };
  }

  private mergeNotes(notes1?: string, notes2?: string): string | undefined {
    if (!notes1 && !notes2) return undefined;
    if (!notes1) return notes2;
    if (!notes2) return notes1;

    // If notes are identical, return one
    if (notes1 === notes2) return notes1;

    // Combine different notes
    return `${notes1}\n\n--- Additional Notes ---\n${notes2}`;
  }

  private mergeWorkflowSteps(steps1: any[], steps2: any[]): any[] {
    // Simple merge - prefer completed steps from either source
    const mergedSteps = [...steps1];

    for (const step2 of steps2) {
      const existingStep = mergedSteps.find(s => s.id === step2.id);
      if (!existingStep) {
        mergedSteps.push(step2);
      } else if (step2.status === 'completed' && existingStep.status !== 'completed') {
        existingStep.status = 'completed';
        existingStep.completed_at = step2.completed_at;
      }
    }

    return mergedSteps;
  }

  private async validateResolvedData(recordType: string, data: any): Promise<void> {
    // Basic validation
    if (!data.id) {
      throw new Error('Record ID is required');
    }

    // Type-specific validation
    switch (recordType) {
      case 'consultation':
        if (!data.patient_id || !data.provider_id) {
          throw new Error('Consultation requires patient and provider IDs');
        }
        break;
      case 'clinical_workflow':
        if (!data.patient_id || !data.workflow_type) {
          throw new Error('Clinical workflow requires patient ID and workflow type');
        }
        break;
      case 'medical_record':
        if (!data.patient_id || !data.title || !data.content) {
          throw new Error('Medical record requires patient ID, title, and content');
        }
        break;
      case 'clinical_decision_support':
        if (!data.patient_id || !data.rule_type || !data.message) {
          throw new Error('CDS requires patient ID, rule type, and message');
        }
        break;
    }
  }
}