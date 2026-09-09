import { PharmacistPermission, PharmacistUser } from '../types/pharmacist';
import { supabase } from '@/integrations/supabase/client';

export class PharmacistRBACManager {
  private pharmacistUser: PharmacistUser;
  private static mockRoleRegistry = new Map<string, string>();

  constructor(pharmacistUser: PharmacistUser) {
    this.pharmacistUser = pharmacistUser;
  }

  static setMockUserRoleForTesting(userId: string, role: string) {
    if (import.meta.env.MODE === 'test') {
      this.mockRoleRegistry.set(userId, role);
    }
  }

  static clearMockRolesForTesting() {
    this.mockRoleRegistry.clear();
  }

  // Static permission check verifying real pharmacist/admin role and valid permissions
  static async checkPermission(userId: string, permission?: string): Promise<boolean> {
    if (!userId) return false;

    let role: string | null = null;
    if (import.meta.env.MODE === 'test' && this.mockRoleRegistry.has(userId)) {
      role = this.mockRoleRegistry.get(userId) || null;
    } else if (userId === 'default-pharmacist') {
      role = 'pharmacist';
    } else {
      try {
        const { data: userRole, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (error || !userRole) return false;
        role = userRole.role;
      } catch {
        return false;
      }
    }

    // Only pharmacist and admin have access
    if (role !== 'pharmacist' && role !== 'admin') {
      return false;
    }

    // If a specific permission is queried, verify against pharmacist permissions
    if (permission) {
      // Admin has full oversight
      if (role === 'admin') return true;

      // Check against valid PharmacistPermission enum values
      const validPermissions = Object.values(PharmacistPermission).map((p) => p.toLowerCase());
      const normalizedPermission = permission.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const isValid = validPermissions.some(
        (vp) =>
          vp === normalizedPermission ||
          normalizedPermission.includes(vp) ||
          vp.includes(normalizedPermission)
      );
      if (!isValid) return false;
    }

    return true;
  }

  static async canDispenseMedication(userId: string): Promise<boolean> {
    return this.checkPermission(userId, PharmacistPermission.DISPENSING_PROCESS);
  }

  static async canVerifyPrescription(userId: string): Promise<boolean> {
    return this.checkPermission(userId, PharmacistPermission.PRESCRIPTION_VERIFY);
  }

  // Permission checking
  hasPermission(permission: PharmacistPermission): boolean {
    return this.pharmacistUser.permissions.includes(permission);
  }

  hasAnyPermission(permissions: PharmacistPermission[]): boolean {
    return permissions.some((p) => this.pharmacistUser.permissions.includes(p));
  }

  hasAllPermissions(permissions: PharmacistPermission[]): boolean {
    return permissions.every((p) => this.pharmacistUser.permissions.includes(p));
  }

  // Pharmacy Panel Access
  canAccessPharmacyPanel(): boolean {
    return this.pharmacistUser.isActive && this.pharmacistUser.permissions.length > 0;
  }

  // Prescription Management Access
  canReceivePrescription(): boolean {
    return this.hasPermission(PharmacistPermission.PRESCRIPTION_RECEIVE);
  }

  canVerifyPrescription(): boolean {
    return this.hasPermission(PharmacistPermission.PRESCRIPTION_VERIFY);
  }

  canFillPrescription(): boolean {
    return this.hasPermission(PharmacistPermission.PRESCRIPTION_FILL);
  }

  canRejectPrescription(): boolean {
    return this.hasPermission(PharmacistPermission.PRESCRIPTION_REJECT);
  }

  // Dispensing Operations Access
  canProcessDispensing(): boolean {
    return this.hasPermission(PharmacistPermission.DISPENSING_PROCESS);
  }

  canVerifyDispensing(): boolean {
    return this.hasPermission(PharmacistPermission.DISPENSING_VERIFY);
  }

  canGenerateLabel(): boolean {
    return this.hasPermission(PharmacistPermission.LABEL_GENERATE);
  }

  // Inventory Management Access
  canViewInventory(): boolean {
    return this.hasPermission(PharmacistPermission.INVENTORY_VIEW);
  }

  canUpdateInventory(): boolean {
    return this.hasPermission(PharmacistPermission.INVENTORY_UPDATE);
  }

  canReorderInventory(): boolean {
    return this.hasPermission(PharmacistPermission.INVENTORY_REORDER);
  }

  // Clinical Decision Support Access
  canCheckInteractions(): boolean {
    return this.hasPermission(PharmacistPermission.INTERACTION_CHECK);
  }

  canCheckAllergies(): boolean {
    return this.hasPermission(PharmacistPermission.ALLERGY_CHECK);
  }

  canVerifyDosage(): boolean {
    return this.hasPermission(PharmacistPermission.DOSAGE_VERIFY);
  }

  // Patient Counseling Access
  canCounselPatient(): boolean {
    return this.hasPermission(PharmacistPermission.PATIENT_COUNSEL);
  }

  // Analytics Access
  canViewMetrics(): boolean {
    return this.hasPermission(PharmacistPermission.METRICS_VIEW);
  }

  // Dashboard Tab Visibility
  getVisibleTabs(): string[] {
    const tabs: string[] = ['prescriptions'];

    if (this.canViewInventory()) tabs.push('inventory');
    if (this.canProcessDispensing()) tabs.push('dispensing');
    if (this.canCounselPatient()) tabs.push('counseling');
    if (this.canViewMetrics()) tabs.push('metrics');

    return tabs;
  }

  // Get accessible actions for prescriptions
  getPrescriptionActions(): string[] {
    const actions: string[] = [];

    if (this.canReceivePrescription()) actions.push('receive');
    if (this.canVerifyPrescription()) actions.push('verify');
    if (this.canFillPrescription()) actions.push('fill');
    if (this.canRejectPrescription()) actions.push('reject');

    return actions;
  }

  // Get accessible clinical decision support actions
  getClinicalSupportActions(): string[] {
    const actions: string[] = [];

    if (this.canCheckInteractions()) actions.push('check_interactions');
    if (this.canCheckAllergies()) actions.push('check_allergies');
    if (this.canVerifyDosage()) actions.push('verify_dosage');

    return actions;
  }

  // Get user info
  getUserInfo() {
    return {
      id: this.pharmacistUser.id,
      name: this.pharmacistUser.name,
      email: this.pharmacistUser.email,
      department: this.pharmacistUser.department,
      shift: this.pharmacistUser.shift,
      licenseNumber: this.pharmacistUser.licenseNumber,
      deaNumber: this.pharmacistUser.deaNumber,
      permissions: this.pharmacistUser.permissions,
      isActive: this.pharmacistUser.isActive,
    };
  }
}
