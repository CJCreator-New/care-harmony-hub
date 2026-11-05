import { FastifyInstance } from 'fastify';
import { Appointment } from '../types/appointment';
import { connectDatabase } from '../config/database';

interface ConflictRecord {
  id: string;
  appointment_id: string;
  conflict_type: string;
  main_data: Appointment;
  microservice_data: Appointment;
  detected_at: Date;
  status: 'pending' | 'resolved' | 'escalated';
  resolution_strategy?: string;
  resolved_at?: Date;
  resolved_by?: string;
}

interface ResolutionResult {
  success: boolean;
  strategy: string;
  resolvedData: Appointment;
  auditLog: string;
}

export class ConflictResolutionService {
  constructor(private fastify: FastifyInstance) {}

  async resolveConflict(conflictId: string, strategy: string, resolvedData?: Appointment): Promise<ResolutionResult> {
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

  // Private resolution strategies
  private async resolveMainWins(conflict: ConflictRecord): Promise<ResolutionResult> {
    const resolvedData = conflict.main_data;
    await this.updateAppointmentInMicroservice(resolvedData);

    return {
      success: true,
      strategy: 'main_wins',
      resolvedData,
      auditLog: `Resolved by accepting main database data for appointment ${conflict.appointment_id}`
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
      auditLog: `Resolved by accepting microservice data for appointment ${conflict.appointment_id}`
    };
  }

  private async resolveMerge(conflict: ConflictRecord): Promise<ResolutionResult> {
    const mainData = conflict.main_data;
    const microData = conflict.microservice_data;

    // Intelligent merge logic for appointments
    const resolvedData: Appointment = {
      ...mainData,
      // Prefer more recent status updates
      status: mainData.updated_at > microData.updated_at ? mainData.status : microData.status,
      // Merge notes if they differ
      notes: this.mergeNotes(mainData.notes, microData.notes),
      // Use the most recent update timestamp
      updated_at: new Date(Math.max(new Date(mainData.updated_at).getTime(), new Date(microData.updated_at).getTime())).toISOString(),
      updated_by: mainData.updated_at > microData.updated_at ? mainData.updated_by : microData.updated_by
    };

    await this.updateAppointmentInMicroservice(resolvedData);

    return {
      success: true,
      strategy: 'merge',
      resolvedData,
      auditLog: `Resolved by merging data for appointment ${conflict.appointment_id}`
    };
  }

  private async resolveManual(conflict: ConflictRecord, resolvedData: Appointment): Promise<ResolutionResult> {
    // Validate the resolved data
    await this.validateResolvedData(resolvedData);

    await this.updateAppointmentInMicroservice(resolvedData);

    return {
      success: true,
      strategy: 'manual',
      resolvedData,
      auditLog: `Resolved manually for appointment ${conflict.appointment_id}`
    };
  }

  private async updateAppointmentInMicroservice(appointment: Appointment): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE appointments
      SET patient_id = $2, provider_id = $3, hospital_id = $4, appointment_type = $5, scheduled_at = $6, duration = $7, status = $8, notes = $9, reason_for_visit = $10, location = $11, virtual_meeting_link = $12, updated_at = $13, updated_by = $14
      WHERE id = $1
    `, [
      appointment.id,
      appointment.patient_id,
      appointment.provider_id,
      appointment.hospital_id,
      appointment.appointment_type,
      appointment.scheduled_at,
      appointment.duration,
      appointment.status,
      appointment.notes,
      appointment.reason_for_visit,
      appointment.location,
      appointment.virtual_meeting_link,
      appointment.updated_at,
      appointment.updated_by
    ]);
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
      INSERT INTO sync_audit_log (id, appointment_id, action, details, performed_at, performed_by)
      VALUES (gen_random_uuid(), $1, 'conflict_resolution', $2, NOW(), 'system')
    `, [conflict.appointment_id, JSON.stringify({
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
      appointmentId: conflict.appointment_id,
      reason
    });
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

  async autoResolveConflicts(): Promise<{ resolved: number; failed: number }> {
    const pendingConflicts = await this.getPendingConflicts();
    let resolved = 0;
    let failed = 0;

    for (const conflict of pendingConflicts) {
      try {
        // Auto-resolve based on simple rules
        let strategy = 'main_wins'; // Default strategy

        // If main data is significantly newer, prefer main
        const mainTime = new Date(conflict.main_data.updated_at).getTime();
        const microTime = new Date(conflict.microservice_data.updated_at).getTime();
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

  private async validateResolvedData(appointment: Appointment): Promise<void> {
    // Basic validation
    if (!appointment.id || !appointment.patient_id || !appointment.provider_id) {
      throw new Error('Invalid appointment data: missing required fields');
    }

    if (new Date(appointment.scheduled_at) < new Date()) {
      throw new Error('Cannot schedule appointment in the past');
    }

    // Additional validation logic would go here
  }
}