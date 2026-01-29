import { FastifyInstance } from 'fastify';
import { LabResult, LabOrder, CriticalValueNotification, SpecimenTracking } from '../types/laboratory';
import { connectDatabase } from '../config/database';

interface ConflictRecord {
  id: string;
  entity_id: string;
  entity_type: 'lab_order' | 'lab_result' | 'critical_notification' | 'specimen_tracking';
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

    try {
      const result = await pool.query(`
        SELECT * FROM sync_conflicts
        WHERE service_name = 'laboratory' AND status = 'pending'
        ORDER BY detected_at DESC
      `);

      return result.rows.map(row => ({
        ...row,
        main_data: JSON.parse(row.main_data),
        microservice_data: JSON.parse(row.microservice_data)
      }));
    } finally {
      // Pool doesn't need to be closed
    }
  }

  async getConflict(conflictId: string): Promise<ConflictRecord | null> {
    const pool = connectDatabase();

    try {
      const result = await pool.query(`
        SELECT * FROM sync_conflicts
        WHERE id = $1
      `, [conflictId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        ...row,
        main_data: JSON.parse(row.main_data),
        microservice_data: JSON.parse(row.microservice_data)
      };
    } finally {
      // Pool doesn't need to be closed
    }
  }

  async getConflictStatistics(): Promise<{
    totalConflicts: number;
    pendingConflicts: number;
    resolvedConflicts: number;
    escalatedConflicts: number;
    averageResolutionTime: number;
  }> {
    const pool = connectDatabase();

    try {
      const result = await pool.query(`
        SELECT
          COUNT(*) as total_conflicts,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_conflicts,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_conflicts,
          COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalated_conflicts,
          AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at))) as avg_resolution_time_seconds
        FROM sync_conflicts
        WHERE service_name = 'laboratory'
      `);

      const row = result.rows[0];
      return {
        totalConflicts: parseInt(row.total_conflicts),
        pendingConflicts: parseInt(row.pending_conflicts),
        resolvedConflicts: parseInt(row.resolved_conflicts),
        escalatedConflicts: parseInt(row.escalated_conflicts),
        averageResolutionTime: parseFloat(row.avg_resolution_time_seconds) || 0
      };
    } finally {
      // Pool doesn't need to be closed
    }
  }

  // Private resolution strategies
  private async resolveMainWins(conflict: ConflictRecord): Promise<ResolutionResult> {
    const resolvedData = conflict.main_data;
    await this.updateEntityInMicroservice(conflict.entity_type, resolvedData);

    return {
      success: true,
      strategy: 'main_wins',
      resolvedData,
      auditLog: `Resolved by accepting main database data for ${conflict.entity_type} ${conflict.entity_id}`
    };
  }

  private async resolveMicroserviceWins(conflict: ConflictRecord): Promise<ResolutionResult> {
    const resolvedData = conflict.microservice_data;
    // Note: In a real implementation, this would also update the main database
    // For now, we just keep the microservice data

    return {
      success: true,
      strategy: 'microservice_wins',
      resolvedData,
      auditLog: `Resolved by accepting microservice data for ${conflict.entity_type} ${conflict.entity_id}`
    };
  }

  private async resolveMerge(conflict: ConflictRecord): Promise<ResolutionResult> {
    const mainData = conflict.main_data;
    const microserviceData = conflict.microservice_data;

    let resolvedData: any;

    // Intelligent merge logic based on entity type
    switch (conflict.entity_type) {
      case 'lab_result':
        resolvedData = this.mergeLabResult(mainData, microserviceData);
        break;
      case 'lab_order':
        resolvedData = this.mergeLabOrder(mainData, microserviceData);
        break;
      case 'critical_notification':
        resolvedData = this.mergeCriticalNotification(mainData, microserviceData);
        break;
      case 'specimen_tracking':
        resolvedData = this.mergeSpecimenTracking(mainData, microserviceData);
        break;
      default:
        throw new Error(`Unknown entity type for merge: ${conflict.entity_type}`);
    }

    await this.updateEntityInMicroservice(conflict.entity_type, resolvedData);

    return {
      success: true,
      strategy: 'merge',
      resolvedData,
      auditLog: `Resolved by merging data for ${conflict.entity_type} ${conflict.entity_id}`
    };
  }

  private async resolveManual(conflict: ConflictRecord, resolvedData: any): Promise<ResolutionResult> {
    // Validate the resolved data
    await this.validateResolvedData(conflict.entity_type, resolvedData);

    await this.updateEntityInMicroservice(conflict.entity_type, resolvedData);

    return {
      success: true,
      strategy: 'manual',
      resolvedData,
      auditLog: `Resolved manually for ${conflict.entity_type} ${conflict.entity_id}`
    };
  }

  private async updateEntityInMicroservice(entityType: string, data: any): Promise<void> {
    const pool = connectDatabase();

    try {
      const tableName = this.getTableName(entityType);
      const updateFields = this.getUpdateFields(entityType, data);

      // Build dynamic update query
      const fieldNames = Object.keys(updateFields);
      const setClause = fieldNames.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const values = fieldNames.map(field => updateFields[field]);

      await pool.query(`
        UPDATE ${tableName}
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1
      `, [data.id, ...values]);
    } finally {
      // Pool doesn't need to be closed
    }
  }

  private async updateConflictStatus(
    conflictId: string,
    status: 'resolved' | 'escalated',
    strategy: string,
    auditLog: string
  ): Promise<void> {
    const pool = connectDatabase();

    try {
      await pool.query(`
        UPDATE sync_conflicts
        SET status = $1, resolution_strategy = $2, resolved_at = $3, resolved_by = $4
        WHERE id = $5
      `, [status, strategy, new Date(), 'system', conflictId]);
    } finally {
      // Pool doesn't need to be closed
    }
  }

  private async logResolution(conflict: ConflictRecord, result: ResolutionResult): Promise<void> {
    const pool = connectDatabase();

    try {
      await pool.query(`
        INSERT INTO sync_audit_log (id, entity_id, entity_type, action, details, performed_at, performed_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        crypto.randomUUID(),
        conflict.entity_id,
        conflict.entity_type,
        'conflict_resolution',
        JSON.stringify({
          strategy: result.strategy,
          auditLog: result.auditLog,
          conflictId: conflict.id
        }),
        new Date(),
        'system'
      ]);
    } finally {
      // Pool doesn't need to be closed
    }
  }

  private async notifyAdministrators(conflict: ConflictRecord, reason: string): Promise<void> {
    // This would integrate with the notification system
    // For now, just log the escalation
    this.fastify.log.warn({
      msg: 'Conflict escalated - administrator notification needed',
      conflictId: conflict.id,
      entityId: conflict.entity_id,
      entityType: conflict.entity_type,
      reason
    });
  }

  // Entity-specific merge logic
  private mergeLabResult(mainData: LabResult, microData: LabResult): LabResult {
    return {
      ...mainData,
      // Prefer final status over preliminary
      result_status: mainData.result_status === 'final' ? mainData.result_status :
                    microData.result_status === 'final' ? microData.result_status :
                    mainData.result_status,
      // Use most recent verification
      verified_at: mainData.verified_at || microData.verified_at,
      verified_by: mainData.verified_by || microData.verified_by,
      // Merge interpretations if different
      interpretation: this.mergeText(mainData.interpretation, microData.interpretation),
      // Use most recent update
      updated_at: new Date(Math.max(new Date(mainData.created_at).getTime(), new Date(microData.created_at).getTime())).toISOString()
    };
  }

  private mergeLabOrder(mainData: LabOrder, microData: LabOrder): LabOrder {
    return {
      ...mainData,
      // Prefer more advanced status
      status: this.getHigherPriorityStatus(mainData.status, microData.status),
      // Merge notes
      notes: this.mergeText(mainData.notes, microData.notes),
      // Use most recent update
      updated_at: new Date(Math.max(new Date(mainData.updated_at).getTime(), new Date(microData.updated_at).getTime())).toISOString()
    };
  }

  private mergeCriticalNotification(main: CriticalValueNotification, micro: CriticalValueNotification): CriticalValueNotification {
    return {
      ...main,
      // Prefer acknowledged over unacknowledged
      acknowledged_at: main.acknowledged_at || micro.acknowledged_at,
      acknowledged_by: main.acknowledged_by || micro.acknowledged_by,
      read_back_verified: main.read_back_verified || micro.read_back_verified,
      // Use higher escalation level
      escalation_level: Math.max(main.escalation_level, micro.escalation_level),
      // Merge resolution notes
      resolution_notes: this.mergeText(main.resolution_notes, micro.resolution_notes)
    };
  }

  private mergeSpecimenTracking(main: SpecimenTracking, micro: SpecimenTracking): SpecimenTracking {
    return {
      ...main,
      // Use most recent timestamps
      received_time: main.received_time || micro.received_time,
      processing_started: main.processing_started || micro.processing_started,
      // Merge chain of custody
      chain_of_custody: [...(main.chain_of_custody || []), ...(micro.chain_of_custody || [])]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    };
  }

  private mergeText(text1?: string, text2?: string): string | undefined {
    if (!text1 && !text2) return undefined;
    if (!text1) return text2;
    if (!text2) return text1;
    if (text1 === text2) return text1;
    return `${text1}\n\n--- Additional ---\n${text2}`;
  }

  private getHigherPriorityStatus(status1: string, status2: string): string {
    const priorityOrder = ['ordered', 'collected', 'processing', 'completed', 'cancelled'];
    const index1 = priorityOrder.indexOf(status1);
    const index2 = priorityOrder.indexOf(status2);
    return index1 > index2 ? status1 : status2;
  }

  async autoResolveConflicts(): Promise<{ resolved: number; failed: number }> {
    const pendingConflicts = await this.getPendingConflicts();
    let resolved = 0;
    let failed = 0;

    for (const conflict of pendingConflicts) {
      try {
        // Auto-resolve based on simple rules
        let strategy = 'main_wins'; // Default strategy

        // If timestamps are close, try to merge
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

  private async validateResolvedData(entityType: string, data: any): Promise<void> {
    // Basic validation based on entity type
    switch (entityType) {
      case 'lab_result':
        if (!data.id || !data.lab_order_id || !data.result_value) {
          throw new Error('Invalid lab result data: missing required fields');
        }
        break;
      case 'lab_order':
        if (!data.id || !data.patient_id || !data.doctor_id || !data.test_name) {
          throw new Error('Invalid lab order data: missing required fields');
        }
        break;
      case 'critical_notification':
        if (!data.id || !data.lab_result_id || !data.critical_value) {
          throw new Error('Invalid critical notification data: missing required fields');
        }
        break;
      case 'specimen_tracking':
        if (!data.specimen_id || !data.lab_order_id || !data.collection_time) {
          throw new Error('Invalid specimen tracking data: missing required fields');
        }
        break;
    }
  }

  private getTableName(entityType: string): string {
    switch (entityType) {
      case 'lab_order': return 'lab_orders';
      case 'lab_result': return 'lab_results';
      case 'critical_notification': return 'critical_value_notifications';
      case 'specimen_tracking': return 'specimen_tracking';
      default: throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private getUpdateFields(entityType: string, data: any): Record<string, any> {
    // This would need to be implemented based on the actual table schema
    // For now, return a basic update object
    const { id, created_at, ...updateData } = data;
    return {
      ...updateData,
      updated_at: new Date()
    };
  }
}