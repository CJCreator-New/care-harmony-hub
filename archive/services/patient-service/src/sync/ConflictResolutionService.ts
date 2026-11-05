import { FastifyInstance } from 'fastify';
import { connectDatabase } from '../config/database';

interface ConflictRecord {
  id: string;
  patientId: string;
  conflictType: string;
  mainData: any;
  microserviceData: any;
  detectedAt: Date;
  status: 'pending' | 'resolved' | 'escalated';
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

interface ResolutionStrategy {
  type: 'main_wins' | 'microservice_wins' | 'merge' | 'manual';
  mergeRules?: MergeRule[];
}

interface MergeRule {
  field: string;
  strategy: 'main' | 'microservice' | 'latest' | 'custom';
  customValue?: any;
}

export class ConflictResolutionService {
  constructor(private fastify: FastifyInstance) {}

  async resolveConflict(conflictId: string, strategy: ResolutionStrategy, resolvedBy: string): Promise<void> {
    const conflict = await this.getConflict(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    if (conflict.status !== 'pending') {
      throw new Error(`Conflict ${conflictId} is already ${conflict.status}`);
    }

    try {
      const resolvedData = await this.applyResolutionStrategy(conflict, strategy);

      // Update the microservice with resolved data
      await this.updatePatientWithResolvedData(conflict.patientId, resolvedData);

      // Mark conflict as resolved
      await this.markConflictResolved(conflictId, strategy, resolvedBy);

      this.fastify.log.info(`Resolved conflict ${conflictId} for patient ${conflict.patientId} using strategy ${strategy.type}`);
    } catch (error) {
      this.fastify.log.error({ msg: `Failed to resolve conflict ${conflictId}`, error });
      throw error;
    }
  }

  async getPendingConflicts(limit: number = 50): Promise<ConflictRecord[]> {
    const pool = connectDatabase();
    const result = await pool.query(`
      SELECT * FROM sync_conflicts
      WHERE status = 'pending'
      ORDER BY detected_at ASC
      LIMIT $1
    `, [limit]);

    return result.rows.map((row: any) => ({
      id: row.id,
      patientId: row.patient_id,
      conflictType: row.conflict_type,
      mainData: JSON.parse(row.main_data),
      microserviceData: JSON.parse(row.microservice_data),
      detectedAt: new Date(row.detected_at),
      status: row.status,
      resolution: row.resolution,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      resolvedBy: row.resolved_by
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
      id: row.id,
      patientId: row.patient_id,
      conflictType: row.conflict_type,
      mainData: JSON.parse(row.main_data),
      microserviceData: JSON.parse(row.microservice_data),
      detectedAt: new Date(row.detected_at),
      status: row.status,
      resolution: row.resolution,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      resolvedBy: row.resolved_by
    };
  }

  async escalateConflict(conflictId: string, reason: string, escalatedBy: string): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE sync_conflicts
      SET status = 'escalated', resolution = $2, resolved_by = $3, resolved_at = NOW()
      WHERE id = $1
    `, [conflictId, reason, escalatedBy]);

    this.fastify.log.info(`Escalated conflict ${conflictId}: ${reason}`);
  }

  async getConflictStatistics(): Promise<{
    totalPending: number;
    totalResolved: number;
    totalEscalated: number;
    averageResolutionTime: number;
    conflictsByType: Record<string, number>;
  }> {
    const pool = connectDatabase();
    const statsResult = await pool.query(`
      SELECT
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalated,
        AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at))) as avg_resolution_time
      FROM sync_conflicts
    `);

    const typeStatsResult = await pool.query(`
      SELECT conflict_type, COUNT(*) as count
      FROM sync_conflicts
      GROUP BY conflict_type
    `);

    const stats = statsResult.rows[0];
    const conflictsByType: Record<string, number> = {};
    typeStatsResult.rows.forEach((row: any) => {
      conflictsByType[row.conflict_type] = parseInt(row.count);
    });

    return {
      totalPending: parseInt(stats.pending),
      totalResolved: parseInt(stats.resolved),
      totalEscalated: parseInt(stats.escalated),
      averageResolutionTime: parseFloat(stats.avg_resolution_time) || 0,
      conflictsByType
    };
  }

  async autoResolveConflicts(): Promise<{ resolved: number; failed: number }> {
    const pendingConflicts = await this.getPendingConflicts(100);
    let resolved = 0;
    let failed = 0;

    for (const conflict of pendingConflicts) {
      try {
        const strategy = this.determineAutoResolutionStrategy(conflict);
        if (strategy) {
          await this.resolveConflict(conflict.id, strategy, 'auto-resolver');
          resolved++;
        } else {
          failed++;
        }
      } catch (error) {
        this.fastify.log.error({ msg: `Auto-resolution failed for conflict ${conflict.id}`, error });
        failed++;
      }
    }

    return { resolved, failed };
  }

  // Private helper methods
  private async applyResolutionStrategy(conflict: ConflictRecord, strategy: ResolutionStrategy): Promise<any> {
    switch (strategy.type) {
      case 'main_wins':
        return conflict.mainData;

      case 'microservice_wins':
        return conflict.microserviceData;

      case 'merge':
        return this.mergePatientData(conflict.mainData, conflict.microserviceData, strategy.mergeRules || []);

      case 'manual':
        throw new Error('Manual resolution requires explicit data');

      default:
        throw new Error(`Unknown resolution strategy: ${strategy.type}`);
    }
  }

  private mergePatientData(mainData: any, microserviceData: any, mergeRules: MergeRule[]): any {
    const merged = { ...microserviceData };

    // Apply merge rules
    for (const rule of mergeRules) {
      switch (rule.strategy) {
        case 'main':
          merged[rule.field] = mainData[rule.field];
          break;
        case 'microservice':
          merged[rule.field] = microserviceData[rule.field];
          break;
        case 'latest':
          const mainUpdated = new Date(mainData.updatedAt || 0);
          const microserviceUpdated = new Date(microserviceData.updatedAt || 0);
          merged[rule.field] = mainUpdated > microserviceUpdated ? mainData[rule.field] : microserviceData[rule.field];
          break;
        case 'custom':
          merged[rule.field] = rule.customValue;
          break;
      }
    }

    // Update timestamp
    merged.updatedAt = new Date().toISOString();

    return merged;
  }

  private async updatePatientWithResolvedData(patientId: string, resolvedData: any): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE patients
      SET hospital_id = $2, medical_record_number = $3, first_name = $4, last_name = $5, date_of_birth = $6, gender = $7, email = $8, phone = $9, status = $10, updated_at = $11, updated_by = $12
      WHERE id = $1
    `, [
      patientId,
      resolvedData.hospital_id,
      resolvedData.medical_record_number,
      resolvedData.first_name,
      resolvedData.last_name,
      resolvedData.date_of_birth,
      resolvedData.gender,
      resolvedData.email,
      resolvedData.phone,
      resolvedData.status,
      resolvedData.updated_at,
      resolvedData.updated_by
    ]);
  }

  private async markConflictResolved(conflictId: string, strategy: ResolutionStrategy, resolvedBy: string): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE sync_conflicts
      SET status = 'resolved', resolution = $2, resolved_by = $3, resolved_at = NOW()
      WHERE id = $1
    `, [conflictId, JSON.stringify(strategy), resolvedBy]);
  }

  private determineAutoResolutionStrategy(conflict: ConflictRecord): ResolutionStrategy | null {
    // Simple auto-resolution logic
    // In a real implementation, this would be more sophisticated

    switch (conflict.conflictType) {
      case 'data_mismatch':
        // If main data is newer, use main data
        if (new Date(conflict.mainData.updatedAt) > new Date(conflict.microserviceData.updatedAt)) {
          return { type: 'main_wins' };
        } else {
          return { type: 'microservice_wins' };
        }

      default:
        return null; // Requires manual resolution
    }
  }
}