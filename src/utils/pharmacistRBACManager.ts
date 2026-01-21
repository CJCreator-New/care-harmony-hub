import { PharmacistPermission, PharmacistUser } from '../types/pharmacist';

export class PharmacistRBACManager {
  private pharmacistUser: PharmacistUser;

  constructor(pharmacistUser: PharmacistUser) {
    this.pharmacistUser = pharmacistUser;
  }

  // Permission checking
  hasPermission(permission: PharmacistPermission): boolean {
    return this.pharmacistUser.permissions.includes(permission);
  }

  hasAnyPermission(permissions: PharmacistPermission[]): boolean {
    return permissions.some(p => this.pharmacistUser.permissions.includes(p));
  }

  hasAllPermissions(permissions: PharmacistPermission[]): boolean {
    return permissions.every(p => this.pharmacistUser.permissions.includes(p));
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
