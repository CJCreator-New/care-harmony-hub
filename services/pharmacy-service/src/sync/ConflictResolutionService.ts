import { connectDatabase } from '../config/database';
import { logger } from '../utils/logger';

interface SyncConflict {
  id: string;
  recordId: string;
  recordType: 'prescription' | 'medication' | 'inventory_item' | 'pharmacy_order';
  mainData: any;
  microserviceData: any;
  conflictType: 'data_mismatch' | 'deletion_conflict' | 'creation_conflict';
  resolutionStrategy?: 'main_wins' | 'microservice_wins' | 'merge' | 'manual';
  resolvedData?: any;
  status: 'pending' | 'resolved' | 'auto_resolved';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  hospitalId: string;
}

export class ConflictResolutionService {
  async getPendingConflicts(): Promise<SyncConflict[]> {
    const pool = connectDatabase();
    const result = await pool.query(
      'SELECT * FROM sync_conflicts WHERE status = $1 AND hospital_id = $2 ORDER BY created_at DESC',
      ['pending', 'current_hospital_id'] // Would be replaced with actual hospital ID
    );
    return result.rows;
  }

  async resolveConflict(
    conflictId: string,
    strategy: 'main_wins' | 'microservice_wins' | 'merge' | 'manual',
    manualData?: any
  ): Promise<any> {
    try {
      const pool = connectDatabase();
      const conflict = await pool.query('SELECT * FROM sync_conflicts WHERE id = $1', [conflictId]);

      if (conflict.rows.length === 0) {
        throw new Error('Conflict not found');
      }

      const conflictData = conflict.rows[0];
      let resolvedData;

      switch (strategy) {
        case 'main_wins':
          resolvedData = await this.resolveMainWins(conflictData);
          break;
        case 'microservice_wins':
          resolvedData = await this.resolveMicroserviceWins(conflictData);
          break;
        case 'merge':
          resolvedData = await this.resolveMerge(conflictData);
          break;
        case 'manual':
          resolvedData = await this.resolveManual(conflictData, manualData);
          break;
        default:
          throw new Error('Invalid resolution strategy');
      }

      // Update conflict status
      await pool.query(`
        UPDATE sync_conflicts SET
          resolution_strategy = $2,
          resolved_data = $3,
          status = $4,
          resolved_at = $5,
          resolved_by = $6
        WHERE id = $1
      `, [
        conflictId,
        strategy,
        JSON.stringify(resolvedData),
        'resolved',
        new Date(),
        'current_user_id' // Would be replaced with actual user ID
      ]);

      // Log the resolution
      await this.logConflictResolution(conflictData, strategy, resolvedData);

      return { success: true, resolvedData };
    } catch (error) {
      logger.error('Failed to resolve conflict', { error, conflictId, strategy });
      throw error;
    }
  }

  private async resolveMainWins(conflict: SyncConflict): Promise<any> {
    const resolvedData = conflict.mainData;

    switch (conflict.recordType) {
      case 'prescription':
        await this.updatePrescriptionInMicroservice(resolvedData);
        break;
      case 'medication':
        await this.updateMedicationInMicroservice(resolvedData);
        break;
      case 'inventory_item':
        await this.updateInventoryItemInMicroservice(resolvedData);
        break;
      case 'pharmacy_order':
        await this.updatePharmacyOrderInMicroservice(resolvedData);
        break;
    }

    return resolvedData;
  }

  private async resolveMicroserviceWins(conflict: SyncConflict): Promise<any> {
    const resolvedData = conflict.microserviceData;

    // For microservice wins, we update the main database
    // This would typically involve calling the main service API
    logger.info('Microservice wins resolution - would update main database', {
      recordType: conflict.recordType,
      recordId: conflict.recordId
    });

    return resolvedData;
  }

  private async resolveMerge(conflict: SyncConflict): Promise<any> {
    let resolvedData;

    switch (conflict.recordType) {
      case 'prescription':
        resolvedData = this.mergePrescriptionData(conflict.mainData, conflict.microserviceData);
        break;
      case 'medication':
        resolvedData = this.mergeMedicationData(conflict.mainData, conflict.microserviceData);
        break;
      case 'inventory_item':
        resolvedData = this.mergeInventoryData(conflict.mainData, conflict.microserviceData);
        break;
      case 'pharmacy_order':
        resolvedData = this.mergePharmacyOrderData(conflict.mainData, conflict.microserviceData);
        break;
      default:
        throw new Error(`Unsupported record type for merge: ${conflict.recordType}`);
    }

    await this.applyMergedData(conflict.recordType, resolvedData);
    return resolvedData;
  }

  private async resolveManual(conflict: SyncConflict, manualData: any): Promise<any> {
    if (!manualData) {
      throw new Error('Manual resolution requires manualData');
    }

    // Validate manual data
    const validationResult = await this.validateManualData(conflict.recordType, manualData);
    if (!validationResult.valid) {
      throw new Error(`Invalid manual data: ${validationResult.errors.join(', ')}`);
    }

    await this.applyMergedData(conflict.recordType, manualData);
    return manualData;
  }

  private mergePrescriptionData(main: any, micro: any): any {
    return {
      ...main,
      // Prefer main data for critical fields, but merge non-conflicting micro data
      instructions: main.instructions || micro.instructions,
      status: main.status === 'active' ? main.status : micro.status,
      updated_at: new Date(),
      updated_by: 'conflict_resolution_system'
    };
  }

  private mergeMedicationData(main: any, micro: any): any {
    return {
      ...main,
      // Medications are typically master data, prefer main
      generic_name: main.generic_name || micro.generic_name,
      category: main.category || micro.category,
      updated_at: new Date()
    };
  }

  private mergeInventoryData(main: any, micro: any): any {
    return {
      ...main,
      // For inventory, take the most recent quantities but ensure consistency
      quantity_on_hand: Math.max(main.quantity_on_hand, micro.quantity_on_hand),
      quantity_reserved: Math.min(main.quantity_reserved, micro.quantity_reserved),
      updated_at: new Date()
    };
  }

  private mergePharmacyOrderData(main: any, micro: any): any {
    return {
      ...main,
      // For orders, prefer the most advanced status
      status: this.getMostAdvancedStatus(main.status, micro.status),
      notes: main.notes || micro.notes,
      updated_at: new Date()
    };
  }

  private getMostAdvancedStatus(status1: string, status2: string): string {
    const statusHierarchy = ['pending', 'partially_filled', 'filled', 'cancelled'];
    const index1 = statusHierarchy.indexOf(status1);
    const index2 = statusHierarchy.indexOf(status2);
    return statusHierarchy[Math.max(index1, index2)];
  }

  private async applyMergedData(recordType: string, data: any): Promise<void> {
    switch (recordType) {
      case 'prescription':
        await this.updatePrescriptionInMicroservice(data);
        break;
      case 'medication':
        await this.updateMedicationInMicroservice(data);
        break;
      case 'inventory_item':
        await this.updateInventoryItemInMicroservice(data);
        break;
      case 'pharmacy_order':
        await this.updatePharmacyOrderInMicroservice(data);
        break;
    }
  }

  private async validateManualData(recordType: string, data: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    switch (recordType) {
      case 'prescription':
        if (!data.patient_id) errors.push('Patient ID is required');
        if (!data.medication_id) errors.push('Medication ID is required');
        if (!data.dosage) errors.push('Dosage is required');
        if (data.quantity <= 0) errors.push('Quantity must be positive');
        break;
      case 'medication':
        if (!data.name) errors.push('Medication name is required');
        if (!data.strength) errors.push('Strength is required');
        break;
      case 'inventory_item':
        if (data.quantity_on_hand < 0) errors.push('Quantity on hand cannot be negative');
        if (data.unit_cost < 0) errors.push('Unit cost cannot be negative');
        break;
      case 'pharmacy_order':
        if (data.quantity <= 0) errors.push('Order quantity must be positive');
        break;
    }

    return { valid: errors.length === 0, errors };
  }

  private async updatePrescriptionInMicroservice(data: any): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE prescriptions SET
        dosage = $2, frequency = $3, quantity = $4, instructions = $5,
        status = $6, updated_at = $7, updated_by = $8
      WHERE id = $1
    `, [
      data.id, data.dosage, data.frequency, data.quantity, data.instructions,
      data.status, new Date(), 'conflict_resolution_system'
    ]);
  }

  private async updateMedicationInMicroservice(data: any): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE medications SET
        name = $2, strength = $3, form = $4, category = $5, updated_at = $6
      WHERE id = $1
    `, [
      data.id, data.name, data.strength, data.form, data.category, new Date()
    ]);
  }

  private async updateInventoryItemInMicroservice(data: any): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE inventory_items SET
        quantity_on_hand = $2, quantity_reserved = $3, unit_cost = $4,
        selling_price = $5, updated_at = $6
      WHERE id = $1
    `, [
      data.id, data.quantity_on_hand, data.quantity_reserved,
      data.unit_cost, data.selling_price, new Date()
    ]);
  }

  private async updatePharmacyOrderInMicroservice(data: any): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE pharmacy_orders SET
        quantity = $2, status = $3, notes = $4, updated_at = $5
      WHERE id = $1
    `, [
      data.id, data.quantity, data.status, data.notes, new Date()
    ]);
  }

  private async logConflictResolution(
    conflict: SyncConflict,
    strategy: string,
    resolvedData: any
  ): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO sync_audit_log (
        conflict_id, record_type, record_id, resolution_strategy,
        original_main_data, original_microservice_data, resolved_data,
        resolved_at, resolved_by, hospital_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      conflict.id,
      conflict.recordType,
      conflict.recordId,
      strategy,
      JSON.stringify(conflict.mainData),
      JSON.stringify(conflict.microserviceData),
      JSON.stringify(resolvedData),
      new Date(),
      'conflict_resolution_system',
      conflict.hospitalId
    ]);
  }

  async getConflictStatistics(): Promise<any> {
    const pool = connectDatabase();
    const result = await pool.query(`
      SELECT
        record_type,
        conflict_type,
        resolution_strategy,
        COUNT(*) as count
      FROM sync_conflicts
      WHERE hospital_id = $1
      GROUP BY record_type, conflict_type, resolution_strategy
      ORDER BY record_type, count DESC
    `, ['current_hospital_id']);

    return result.rows;
  }

  async autoResolveConflicts(): Promise<any> {
    try {
      const pendingConflicts = await this.getPendingConflicts();
      const autoResolved = [];

      for (const conflict of pendingConflicts) {
        if (await this.canAutoResolve(conflict)) {
          const resolvedData = await this.resolveMainWins(conflict);
          autoResolved.push({
            id: conflict.id,
            recordType: conflict.recordType,
            recordId: conflict.recordId
          });
        }
      }

      return {
        totalPending: pendingConflicts.length,
        autoResolved: autoResolved.length,
        manualRequired: pendingConflicts.length - autoResolved.length
      };
    } catch (error) {
      logger.error('Failed to auto-resolve conflicts', { error });
      throw error;
    }
  }

  private async canAutoResolve(conflict: SyncConflict): Promise<boolean> {
    // Auto-resolve if it's a simple data mismatch that can be safely resolved with main_wins
    // For pharmacy data, be conservative and require manual resolution for critical fields
    switch (conflict.recordType) {
      case 'prescription':
        return this.isSafePrescriptionConflict(conflict);
      case 'medication':
        return false; // Medications require manual review
      case 'inventory_item':
        return this.isSafeInventoryConflict(conflict);
      case 'pharmacy_order':
        return this.isSafeOrderConflict(conflict);
      default:
        return false;
    }
  }

  private isSafePrescriptionConflict(conflict: SyncConflict): boolean {
    // Only auto-resolve if the differences are in non-critical fields
    const main = conflict.mainData;
    const micro = conflict.microserviceData;

    // Critical fields that require manual review
    if (main.dosage !== micro.dosage || main.frequency !== micro.frequency) {
      return false;
    }

    // Safe to auto-resolve if only notes or timestamps differ
    return true;
  }

  private isSafeInventoryConflict(conflict: SyncConflict): boolean {
    // Auto-resolve inventory conflicts if quantities are close (within 10%)
    const main = conflict.mainData;
    const micro = conflict.microserviceData;

    const quantityDiff = Math.abs(main.quantity_on_hand - micro.quantity_on_hand);
    const avgQuantity = (main.quantity_on_hand + micro.quantity_on_hand) / 2;

    return quantityDiff / avgQuantity <= 0.1; // Within 10%
  }

  private isSafeOrderConflict(conflict: SyncConflict): boolean {
    // Only auto-resolve if status progression is logical
    const main = conflict.mainData;
    const micro = conflict.microserviceData;

    const validProgressions = [
      ['pending', 'partially_filled'],
      ['partially_filled', 'filled'],
      ['pending', 'filled']
    ];

    return validProgressions.some(([from, to]) =>
      main.status === from && micro.status === to
    );
  }
}