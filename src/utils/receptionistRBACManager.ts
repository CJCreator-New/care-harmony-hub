import { ReceptionistPermission, ReceptionistUser } from '../types/receptionist';

export class ReceptionistRBACManager {
  private receptionistUser: ReceptionistUser;

  constructor(receptionistUser: ReceptionistUser) {
    this.receptionistUser = receptionistUser;
  }

  // Permission checking
  hasPermission(permission: ReceptionistPermission): boolean {
    return this.receptionistUser.permissions.includes(permission);
  }

  hasAnyPermission(permissions: ReceptionistPermission[]): boolean {
    return permissions.some(p => this.receptionistUser.permissions.includes(p));
  }

  hasAllPermissions(permissions: ReceptionistPermission[]): boolean {
    return permissions.every(p => this.receptionistUser.permissions.includes(p));
  }

  // Patient Registration Access
  canAccessReceptionPanel(): boolean {
    return this.receptionistUser.isActive && this.receptionistUser.permissions.length > 0;
  }

  canRegisterPatient(): boolean {
    return this.hasPermission(ReceptionistPermission.PATIENT_REGISTER);
  }

  canUpdatePatient(): boolean {
    return this.hasPermission(ReceptionistPermission.PATIENT_UPDATE);
  }

  canVerifyPatient(): boolean {
    return this.hasPermission(ReceptionistPermission.PATIENT_VERIFY);
  }

  // Appointment Management Access
  canCreateAppointment(): boolean {
    return this.hasPermission(ReceptionistPermission.APPOINTMENT_CREATE);
  }

  canModifyAppointment(): boolean {
    return this.hasPermission(ReceptionistPermission.APPOINTMENT_MODIFY);
  }

  canCancelAppointment(): boolean {
    return this.hasPermission(ReceptionistPermission.APPOINTMENT_CANCEL);
  }

  canViewAppointments(): boolean {
    return this.hasPermission(ReceptionistPermission.APPOINTMENT_VIEW);
  }

  // Check-in Operations Access
  canProcessCheckIn(): boolean {
    return this.hasPermission(ReceptionistPermission.CHECKIN_PROCESS);
  }

  canProcessCheckOut(): boolean {
    return this.hasPermission(ReceptionistPermission.CHECKOUT_PROCESS);
  }

  canVerifyInsurance(): boolean {
    return this.hasPermission(ReceptionistPermission.INSURANCE_VERIFY);
  }

  // Queue Management Access
  canViewQueue(): boolean {
    return this.hasPermission(ReceptionistPermission.QUEUE_VIEW);
  }

  canManageQueue(): boolean {
    return this.hasPermission(ReceptionistPermission.QUEUE_MANAGE);
  }

  // Communication Access
  canCommunicateWithPatient(): boolean {
    return this.hasPermission(ReceptionistPermission.PATIENT_COMMUNICATE);
  }

  // Analytics Access
  canViewMetrics(): boolean {
    return this.hasPermission(ReceptionistPermission.METRICS_VIEW);
  }

  // Dashboard Tab Visibility
  getVisibleTabs(): string[] {
    const tabs: string[] = ['appointments'];

    if (this.canRegisterPatient()) tabs.push('registration');
    if (this.canProcessCheckIn()) tabs.push('checkin');
    if (this.canViewQueue()) tabs.push('queue');
    if (this.canCommunicateWithPatient()) tabs.push('communication');
    if (this.canViewMetrics()) tabs.push('metrics');

    return tabs;
  }

  // Get accessible actions for appointments
  getAppointmentActions(): string[] {
    const actions: string[] = [];

    if (this.canCreateAppointment()) actions.push('create');
    if (this.canModifyAppointment()) actions.push('modify');
    if (this.canCancelAppointment()) actions.push('cancel');
    if (this.canViewAppointments()) actions.push('view');

    return actions;
  }

  // Get accessible actions for patients
  getPatientActions(): string[] {
    const actions: string[] = [];

    if (this.canRegisterPatient()) actions.push('register');
    if (this.canUpdatePatient()) actions.push('update');
    if (this.canVerifyPatient()) actions.push('verify');
    if (this.canProcessCheckIn()) actions.push('checkin');
    if (this.canProcessCheckOut()) actions.push('checkout');
    if (this.canVerifyInsurance()) actions.push('verify_insurance');

    return actions;
  }

  // Get user info
  getUserInfo() {
    return {
      id: this.receptionistUser.id,
      name: this.receptionistUser.name,
      email: this.receptionistUser.email,
      department: this.receptionistUser.department,
      shift: this.receptionistUser.shift,
      station: this.receptionistUser.station,
      employeeId: this.receptionistUser.employeeId,
      permissions: this.receptionistUser.permissions,
      isActive: this.receptionistUser.isActive,
    };
  }
}
