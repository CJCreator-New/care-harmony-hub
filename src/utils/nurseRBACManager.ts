import { NursePermission, NurseUser } from '../types/nurse';

export class NurseRBACManager {
  private nurseUser: NurseUser;

  constructor(nurseUser: NurseUser) {
    this.nurseUser = nurseUser;
  }

  // Permission checking
  hasPermission(permission: NursePermission): boolean {
    return this.nurseUser.permissions.includes(permission);
  }

  hasAnyPermission(permissions: NursePermission[]): boolean {
    return permissions.some(p => this.nurseUser.permissions.includes(p));
  }

  hasAllPermissions(permissions: NursePermission[]): boolean {
    return permissions.every(p => this.nurseUser.permissions.includes(p));
  }

  // Patient Management Access
  canAccessNursePanel(): boolean {
    return this.nurseUser.isActive && this.nurseUser.permissions.length > 0;
  }

  canAssessPatient(): boolean {
    return this.hasPermission(NursePermission.PATIENT_ASSESS);
  }

  canMonitorPatient(): boolean {
    return this.hasPermission(NursePermission.PATIENT_MONITOR);
  }

  canAdmitPatient(): boolean {
    return this.hasPermission(NursePermission.PATIENT_ADMIT);
  }

  canDischargePatient(): boolean {
    return this.hasPermission(NursePermission.PATIENT_DISCHARGE);
  }

  // Vital Signs Access
  canRecordVitals(): boolean {
    return this.hasPermission(NursePermission.VITALS_RECORD);
  }

  canMonitorVitals(): boolean {
    return this.hasPermission(NursePermission.VITALS_MONITOR);
  }

  canManageAlerts(): boolean {
    return this.hasPermission(NursePermission.ALERTS_MANAGE);
  }

  // Medication Access
  canAdministerMedication(): boolean {
    return this.hasPermission(NursePermission.MEDICATION_ADMINISTER);
  }

  canVerifyMedication(): boolean {
    return this.hasPermission(NursePermission.MEDICATION_VERIFY);
  }

  canDocumentMedication(): boolean {
    return this.hasPermission(NursePermission.MEDICATION_DOCUMENT);
  }

  // Care Coordination Access
  canViewCarePlan(): boolean {
    return this.hasPermission(NursePermission.CARE_PLAN_VIEW);
  }

  canUpdateCarePlan(): boolean {
    return this.hasPermission(NursePermission.CARE_PLAN_UPDATE);
  }

  canCommunicateWithTeam(): boolean {
    return this.hasPermission(NursePermission.TEAM_COMMUNICATE);
  }

  // Documentation Access
  canCreateNotes(): boolean {
    return this.hasPermission(NursePermission.NOTES_CREATE);
  }

  canViewNotes(): boolean {
    return this.hasPermission(NursePermission.NOTES_VIEW);
  }

  // Analytics Access
  canViewMetrics(): boolean {
    return this.hasPermission(NursePermission.METRICS_VIEW);
  }

  // Dashboard Tab Visibility
  getVisibleTabs(): string[] {
    const tabs: string[] = ['patients'];

    if (this.canMonitorVitals()) tabs.push('vitals');
    if (this.canAdministerMedication()) tabs.push('medications');
    if (this.canViewCarePlan()) tabs.push('care-plans');
    if (this.canCreateNotes()) tabs.push('documentation');
    if (this.canViewMetrics()) tabs.push('metrics');

    return tabs;
  }

  // Get accessible actions for patient
  getPatientActions(): string[] {
    const actions: string[] = [];

    if (this.canAssessPatient()) actions.push('assess');
    if (this.canMonitorPatient()) actions.push('monitor');
    if (this.canAdmitPatient()) actions.push('admit');
    if (this.canDischargePatient()) actions.push('discharge');
    if (this.canRecordVitals()) actions.push('record_vitals');
    if (this.canAdministerMedication()) actions.push('administer_medication');
    if (this.canUpdateCarePlan()) actions.push('update_care_plan');
    if (this.canCreateNotes()) actions.push('create_notes');

    return actions;
  }

  // Get user info
  getUserInfo() {
    return {
      id: this.nurseUser.id,
      name: this.nurseUser.name,
      email: this.nurseUser.email,
      department: this.nurseUser.department,
      shift: this.nurseUser.shift,
      licenseNumber: this.nurseUser.licenseNumber,
      permissions: this.nurseUser.permissions,
      isActive: this.nurseUser.isActive,
    };
  }
}
