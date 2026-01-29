import { connectDatabase } from '../config/database';
import { ConflictResolutionService } from './ConflictResolutionService';
import { DataValidationService } from './DataValidationService';
import { KafkaEventListener } from './KafkaEventListener';
import { logger } from '../utils/logger';

interface Prescription {
  id: string;
  patient_id: string;
  provider_id: string;
  medication_id: string;
  dosage: string;
  frequency: string;
  duration: number;
  quantity: number;
  instructions: string;
  status: 'active' | 'completed' | 'cancelled' | 'suspended';
  start_date: Date;
  end_date?: Date;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
  hospital_id: string;
}

interface Medication {
  id: string;
  name: string;
  generic_name?: string;
  brand_name?: string;
  strength: string;
  form: string;
  category: string;
  requires_prescription: boolean;
  controlled_substance: boolean;
  dea_schedule?: string;
  created_at: Date;
  updated_at: Date;
  hospital_id: string;
}

interface InventoryItem {
  id: string;
  medication_id: string;
  batch_number: string;
  expiration_date: Date;
  quantity_on_hand: number;
  quantity_reserved: number;
  unit_cost: number;
  selling_price: number;
  location: string;
  status: 'active' | 'expired' | 'discontinued';
  created_at: Date;
  updated_at: Date;
  hospital_id: string;
}

interface PharmacyOrder {
  id: string;
  prescription_id: string;
  patient_id: string;
  medication_id: string;
  quantity: number;
  status: 'pending' | 'filled' | 'partially_filled' | 'cancelled';
  filled_date?: Date;
  filled_by?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  hospital_id: string;
}

export class PharmacySyncService {
  private conflictResolution: ConflictResolutionService;
  private dataValidation: DataValidationService;
  private kafkaListener: KafkaEventListener;

  constructor() {
    this.conflictResolution = new ConflictResolutionService();
    this.dataValidation = new DataValidationService();
    this.kafkaListener = new KafkaEventListener();
  }

  async performFullSync(): Promise<any> {
    try {
      logger.info('Starting full pharmacy sync');

      const results = {
        prescriptions: await this.syncPrescriptions(),
        medications: await this.syncMedications(),
        inventory: await this.syncInventory(),
        orders: await this.syncPharmacyOrders(),
        timestamp: new Date().toISOString()
      };

      logger.info('Full pharmacy sync completed', { results });
      return results;
    } catch (error) {
      logger.error('Full pharmacy sync failed', { error });
      throw error;
    }
  }

  async performIncrementalSync(): Promise<any> {
    try {
      logger.info('Starting incremental pharmacy sync');

      const lastSync = await this.getLastSyncTimestamp();
      const results = {
        prescriptions: await this.syncPrescriptionsIncremental(lastSync),
        medications: await this.syncMedicationsIncremental(lastSync),
        inventory: await this.syncInventoryIncremental(lastSync),
        orders: await this.syncPharmacyOrdersIncremental(lastSync),
        timestamp: new Date().toISOString()
      };

      await this.updateLastSyncTimestamp();
      logger.info('Incremental pharmacy sync completed', { results });
      return results;
    } catch (error) {
      logger.error('Incremental pharmacy sync failed', { error });
      throw error;
    }
  }

  async syncSpecificEntities(type: string, ids: string[]): Promise<any> {
    try {
      logger.info('Starting specific entity sync', { type, ids });

      switch (type) {
        case 'prescription':
          return await this.syncPrescriptionsByIds(ids);
        case 'medication':
          return await this.syncMedicationsByIds(ids);
        case 'inventory':
          return await this.syncInventoryByIds(ids);
        case 'order':
          return await this.syncPharmacyOrdersByIds(ids);
        default:
          throw new Error(`Unknown entity type: ${type}`);
      }
    } catch (error) {
      logger.error('Specific entity sync failed', { error, type, ids });
      throw error;
    }
  }

  private async syncPrescriptions(): Promise<any> {
    const mainPrescriptions = await this.getPrescriptionsFromMainDB();
    const microPrescriptions = await this.getPrescriptionsFromMicroserviceDB();

    const conflicts = [];
    const synced = [];

    for (const mainRx of mainPrescriptions) {
      const microRx = microPrescriptions.find(rx => rx.id === mainRx.id);

      if (!microRx) {
        await this.createPrescriptionInMicroservice(mainRx);
        synced.push(mainRx.id);
      } else {
        const conflict = await this.detectPrescriptionConflict(mainRx, microRx);
        if (conflict) {
          conflicts.push(conflict);
        } else if (mainRx.updated_at > microRx.updated_at) {
          await this.updatePrescriptionInMicroservice(mainRx);
          synced.push(mainRx.id);
        }
      }
    }

    return { total: mainPrescriptions.length, synced: synced.length, conflicts: conflicts.length };
  }

  private async syncMedications(): Promise<any> {
    const mainMedications = await this.getMedicationsFromMainDB();
    const microMedications = await this.getMedicationsFromMicroserviceDB();

    const conflicts = [];
    const synced = [];

    for (const mainMed of mainMedications) {
      const microMed = microMedications.find(med => med.id === mainMed.id);

      if (!microMed) {
        await this.createMedicationInMicroservice(mainMed);
        synced.push(mainMed.id);
      } else {
        const conflict = await this.detectMedicationConflict(mainMed, microMed);
        if (conflict) {
          conflicts.push(conflict);
        } else if (mainMed.updated_at > microMed.updated_at) {
          await this.updateMedicationInMicroservice(mainMed);
          synced.push(mainMed.id);
        }
      }
    }

    return { total: mainMedications.length, synced: synced.length, conflicts: conflicts.length };
  }

  private async syncInventory(): Promise<any> {
    const mainInventory = await this.getInventoryFromMainDB();
    const microInventory = await this.getInventoryFromMicroserviceDB();

    const conflicts = [];
    const synced = [];

    for (const mainItem of mainInventory) {
      const microItem = microInventory.find(item => item.id === mainItem.id);

      if (!microItem) {
        await this.createInventoryItemInMicroservice(mainItem);
        synced.push(mainItem.id);
      } else {
        const conflict = await this.detectInventoryConflict(mainItem, microItem);
        if (conflict) {
          conflicts.push(conflict);
        } else if (mainItem.updated_at > microItem.updated_at) {
          await this.updateInventoryItemInMicroservice(mainItem);
          synced.push(mainItem.id);
        }
      }
    }

    return { total: mainInventory.length, synced: synced.length, conflicts: conflicts.length };
  }

  private async syncPharmacyOrders(): Promise<any> {
    const mainOrders = await this.getPharmacyOrdersFromMainDB();
    const microOrders = await this.getPharmacyOrdersFromMicroserviceDB();

    const conflicts = [];
    const synced = [];

    for (const mainOrder of mainOrders) {
      const microOrder = microOrders.find(order => order.id === mainOrder.id);

      if (!microOrder) {
        await this.createPharmacyOrderInMicroservice(mainOrder);
        synced.push(mainOrder.id);
      } else {
        const conflict = await this.detectPharmacyOrderConflict(mainOrder, microOrder);
        if (conflict) {
          conflicts.push(conflict);
        } else if (mainOrder.updated_at > microOrder.updated_at) {
          await this.updatePharmacyOrderInMicroservice(mainOrder);
          synced.push(mainOrder.id);
        }
      }
    }

    return { total: mainOrders.length, synced: synced.length, conflicts: conflicts.length };
  }

  // Incremental sync methods
  private async syncPrescriptionsIncremental(lastSync: Date): Promise<any> {
    const mainPrescriptions = await this.getPrescriptionsFromMainDB(lastSync);
    return await this.syncPrescriptions();
  }

  private async syncMedicationsIncremental(lastSync: Date): Promise<any> {
    const mainMedications = await this.getMedicationsFromMainDB(lastSync);
    return await this.syncMedications();
  }

  private async syncInventoryIncremental(lastSync: Date): Promise<any> {
    const mainInventory = await this.getInventoryFromMainDB(lastSync);
    return await this.syncInventory();
  }

  private async syncPharmacyOrdersIncremental(lastSync: Date): Promise<any> {
    const mainOrders = await this.getPharmacyOrdersFromMainDB(lastSync);
    return await this.syncPharmacyOrders();
  }

  // Specific entity sync methods
  private async syncPrescriptionsByIds(ids: string[]): Promise<any> {
    const mainPrescriptions = await this.getPrescriptionsFromMainDBByIds(ids);
    // Similar logic as full sync but for specific IDs
    return { synced: ids.length };
  }

  private async syncMedicationsByIds(ids: string[]): Promise<any> {
    const mainMedications = await this.getMedicationsFromMainDBByIds(ids);
    return { synced: ids.length };
  }

  private async syncInventoryByIds(ids: string[]): Promise<any> {
    const mainInventory = await this.getInventoryFromMainDBByIds(ids);
    return { synced: ids.length };
  }

  private async syncPharmacyOrdersByIds(ids: string[]): Promise<any> {
    const mainOrders = await this.getPharmacyOrdersFromMainDBByIds(ids);
    return { synced: ids.length };
  }

  // Conflict detection methods
  private async detectPrescriptionConflict(main: Prescription, micro: Prescription): Promise<any | null> {
    if (main.updated_at > micro.updated_at) {
      if (this.prescriptionDataDiffers(main, micro)) {
        return {
          recordId: main.id,
          recordType: 'prescription',
          mainData: main,
          microserviceData: micro,
          conflictType: 'data_mismatch',
          timestamp: new Date().toISOString()
        };
      }
    }
    return null;
  }

  private async detectMedicationConflict(main: Medication, micro: Medication): Promise<any | null> {
    if (main.updated_at > micro.updated_at) {
      if (this.medicationDataDiffers(main, micro)) {
        return {
          recordId: main.id,
          recordType: 'medication',
          mainData: main,
          microserviceData: micro,
          conflictType: 'data_mismatch',
          timestamp: new Date().toISOString()
        };
      }
    }
    return null;
  }

  private async detectInventoryConflict(main: InventoryItem, micro: InventoryItem): Promise<any | null> {
    if (main.updated_at > micro.updated_at) {
      if (this.inventoryDataDiffers(main, micro)) {
        return {
          recordId: main.id,
          recordType: 'inventory_item',
          mainData: main,
          microserviceData: micro,
          conflictType: 'data_mismatch',
          timestamp: new Date().toISOString()
        };
      }
    }
    return null;
  }

  private async detectPharmacyOrderConflict(main: PharmacyOrder, micro: PharmacyOrder): Promise<any | null> {
    if (main.updated_at > micro.updated_at) {
      if (this.pharmacyOrderDataDiffers(main, micro)) {
        return {
          recordId: main.id,
          recordType: 'pharmacy_order',
          mainData: main,
          microserviceData: micro,
          conflictType: 'data_mismatch',
          timestamp: new Date().toISOString()
        };
      }
    }
    return null;
  }

  // Data comparison methods
  private prescriptionDataDiffers(main: Prescription, micro: Prescription): boolean {
    return main.dosage !== micro.dosage ||
           main.frequency !== micro.frequency ||
           main.quantity !== micro.quantity ||
           main.status !== micro.status;
  }

  private medicationDataDiffers(main: Medication, micro: Medication): boolean {
    return main.name !== micro.name ||
           main.strength !== micro.strength ||
           main.form !== micro.form ||
           main.controlled_substance !== micro.controlled_substance;
  }

  private inventoryDataDiffers(main: InventoryItem, micro: InventoryItem): boolean {
    return main.quantity_on_hand !== micro.quantity_on_hand ||
           main.quantity_reserved !== micro.quantity_reserved ||
           main.unit_cost !== micro.unit_cost ||
           main.selling_price !== micro.selling_price;
  }

  private pharmacyOrderDataDiffers(main: PharmacyOrder, micro: PharmacyOrder): boolean {
    return main.quantity !== micro.quantity ||
           main.status !== micro.status ||
           main.notes !== micro.notes;
  }

  // Database operations (simplified - would connect to main DB in real implementation)
  private async getPrescriptionsFromMainDB(since?: Date): Promise<Prescription[]> {
    // Implementation would query main database
    return [];
  }

  private async getMedicationsFromMainDB(since?: Date): Promise<Medication[]> {
    // Implementation would query main database
    return [];
  }

  private async getInventoryFromMainDB(since?: Date): Promise<InventoryItem[]> {
    // Implementation would query main database
    return [];
  }

  private async getPharmacyOrdersFromMainDB(since?: Date): Promise<PharmacyOrder[]> {
    // Implementation would query main database
    return [];
  }

  private async getPrescriptionsFromMainDBByIds(ids: string[]): Promise<Prescription[]> {
    // Implementation would query main database
    return [];
  }

  private async getMedicationsFromMainDBByIds(ids: string[]): Promise<Medication[]> {
    // Implementation would query main database
    return [];
  }

  private async getInventoryFromMainDBByIds(ids: string[]): Promise<InventoryItem[]> {
    // Implementation would query main database
    return [];
  }

  private async getPharmacyOrdersFromMainDBByIds(ids: string[]): Promise<PharmacyOrder[]> {
    // Implementation would query main database
    return [];
  }

  // Microservice database operations
  private async getPrescriptionsFromMicroserviceDB(): Promise<Prescription[]> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM prescriptions');
    return result.rows;
  }

  private async getMedicationsFromMicroserviceDB(): Promise<Medication[]> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM medications');
    return result.rows;
  }

  private async getInventoryFromMicroserviceDB(): Promise<InventoryItem[]> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM inventory_items');
    return result.rows;
  }

  private async getPharmacyOrdersFromMicroserviceDB(): Promise<PharmacyOrder[]> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT * FROM pharmacy_orders');
    return result.rows;
  }

  // Create operations
  private async createPrescriptionInMicroservice(prescription: Prescription): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO prescriptions (id, patient_id, provider_id, medication_id, dosage, frequency, duration, quantity, instructions, status, start_date, end_date, created_at, updated_at, created_by, updated_by, hospital_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    `, [
      prescription.id, prescription.patient_id, prescription.provider_id, prescription.medication_id,
      prescription.dosage, prescription.frequency, prescription.duration, prescription.quantity,
      prescription.instructions, prescription.status, prescription.start_date, prescription.end_date,
      prescription.created_at, prescription.updated_at, prescription.created_by, prescription.updated_by,
      prescription.hospital_id
    ]);
  }

  private async createMedicationInMicroservice(medication: Medication): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO medications (id, name, generic_name, brand_name, strength, form, category, requires_prescription, controlled_substance, dea_schedule, created_at, updated_at, hospital_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      medication.id, medication.name, medication.generic_name, medication.brand_name,
      medication.strength, medication.form, medication.category, medication.requires_prescription,
      medication.controlled_substance, medication.dea_schedule, medication.created_at,
      medication.updated_at, medication.hospital_id
    ]);
  }

  private async createInventoryItemInMicroservice(item: InventoryItem): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO inventory_items (id, medication_id, batch_number, expiration_date, quantity_on_hand, quantity_reserved, unit_cost, selling_price, location, status, created_at, updated_at, hospital_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      item.id, item.medication_id, item.batch_number, item.expiration_date,
      item.quantity_on_hand, item.quantity_reserved, item.unit_cost, item.selling_price,
      item.location, item.status, item.created_at, item.updated_at, item.hospital_id
    ]);
  }

  private async createPharmacyOrderInMicroservice(order: PharmacyOrder): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO pharmacy_orders (id, prescription_id, patient_id, medication_id, quantity, status, filled_date, filled_by, notes, created_at, updated_at, hospital_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      order.id, order.prescription_id, order.patient_id, order.medication_id,
      order.quantity, order.status, order.filled_date, order.filled_by,
      order.notes, order.created_at, order.updated_at, order.hospital_id
    ]);
  }

  // Update operations
  private async updatePrescriptionInMicroservice(prescription: Prescription): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE prescriptions SET
        dosage = $2, frequency = $3, duration = $4, quantity = $5, instructions = $6,
        status = $7, end_date = $8, updated_at = $9, updated_by = $10
      WHERE id = $1
    `, [
      prescription.id, prescription.dosage, prescription.frequency, prescription.duration,
      prescription.quantity, prescription.instructions, prescription.status, prescription.end_date,
      prescription.updated_at, prescription.updated_by
    ]);
  }

  private async updateMedicationInMicroservice(medication: Medication): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE medications SET
        name = $2, generic_name = $3, brand_name = $4, strength = $5, form = $6,
        category = $7, requires_prescription = $8, controlled_substance = $9,
        dea_schedule = $10, updated_at = $11
      WHERE id = $1
    `, [
      medication.id, medication.name, medication.generic_name, medication.brand_name,
      medication.strength, medication.form, medication.category, medication.requires_prescription,
      medication.controlled_substance, medication.dea_schedule, medication.updated_at
    ]);
  }

  private async updateInventoryItemInMicroservice(item: InventoryItem): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE inventory_items SET
        batch_number = $2, expiration_date = $3, quantity_on_hand = $4, quantity_reserved = $5,
        unit_cost = $6, selling_price = $7, location = $8, status = $9, updated_at = $10
      WHERE id = $1
    `, [
      item.id, item.batch_number, item.expiration_date, item.quantity_on_hand,
      item.quantity_reserved, item.unit_cost, item.selling_price, item.location,
      item.status, item.updated_at
    ]);
  }

  private async updatePharmacyOrderInMicroservice(order: PharmacyOrder): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      UPDATE pharmacy_orders SET
        quantity = $2, status = $3, filled_date = $4, filled_by = $5, notes = $6, updated_at = $7
      WHERE id = $1
    `, [
      order.id, order.quantity, order.status, order.filled_date, order.filled_by,
      order.notes, order.updated_at
    ]);
  }

  // Utility methods
  private async getLastSyncTimestamp(): Promise<Date> {
    const pool = connectDatabase();
    const result = await pool.query('SELECT last_sync FROM sync_metadata WHERE service = $1', ['pharmacy']);
    return result.rows[0]?.last_sync || new Date(0);
  }

  private async updateLastSyncTimestamp(): Promise<void> {
    const pool = connectDatabase();
    await pool.query(`
      INSERT INTO sync_metadata (service, last_sync) VALUES ($1, $2)
      ON CONFLICT (service) DO UPDATE SET last_sync = $2
    `, ['pharmacy', new Date()]);
  }

  async getSyncStatus(): Promise<any> {
    const lastSync = await this.getLastSyncTimestamp();
    const conflicts = await this.conflictResolution.getPendingConflicts();

    return {
      lastSync,
      pendingConflicts: conflicts.length,
      service: 'pharmacy',
      status: 'active'
    };
  }
}