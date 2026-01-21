// Doctor RBAC Manager
import { UserRole } from '@/types/auth';
import { DoctorPermission } from '@/types/doctor';

export const DOCTOR_PERMISSIONS: Record<string, DoctorPermission[]> = {
  doctor: [
    DoctorPermission.CONSULTATION_CREATE,
    DoctorPermission.CONSULTATION_READ,
    DoctorPermission.CONSULTATION_UPDATE,
    DoctorPermission.CONSULTATION_CLOSE,
    DoctorPermission.PRESCRIPTION_CREATE,
    DoctorPermission.PRESCRIPTION_READ,
    DoctorPermission.PRESCRIPTION_MODIFY,
    DoctorPermission.LAB_ORDER_CREATE,
    DoctorPermission.LAB_ORDER_READ,
    DoctorPermission.LAB_RESULT_VIEW,
    DoctorPermission.PATIENT_READ_ALL,
    DoctorPermission.PATIENT_UPDATE,
    DoctorPermission.PATIENT_HISTORY,
    DoctorPermission.ANALYTICS_VIEW_DEPT,
    DoctorPermission.ANALYTICS_PERSONAL,
    DoctorPermission.QUEUE_READ,
    DoctorPermission.QUEUE_MANAGE,
    DoctorPermission.TELEMEDICINE_READ,
    DoctorPermission.TELEMEDICINE_WRITE,
  ],
};

export class DoctorRBACManager {
  static hasPermission(role: UserRole | undefined, permission: DoctorPermission): boolean {
    if (!role || role !== 'doctor') return false;
    const permissions = DOCTOR_PERMISSIONS['doctor'] || [];
    return permissions.includes(permission);
  }

  static hasAnyPermission(role: UserRole | undefined, permissions: DoctorPermission[]): boolean {
    if (!role || role !== 'doctor') return false;
    return permissions.some(p => this.hasPermission(role, p));
  }

  static hasAllPermissions(role: UserRole | undefined, permissions: DoctorPermission[]): boolean {
    if (!role || role !== 'doctor') return false;
    return permissions.every(p => this.hasPermission(role, p));
  }

  static canAccessDoctorPanel(role: UserRole | undefined): boolean {
    return role === 'doctor';
  }

  static canManagePatient(role: UserRole | undefined, patientId: string): boolean {
    if (!role || role !== 'doctor') return false;
    return this.hasPermission(role, DoctorPermission.PATIENT_READ_ALL);
  }

  static canCreateConsultation(role: UserRole | undefined): boolean {
    if (!role || role !== 'doctor') return false;
    return this.hasPermission(role, DoctorPermission.CONSULTATION_CREATE);
  }

  static canPrescribeMedication(role: UserRole | undefined): boolean {
    if (!role || role !== 'doctor') return false;
    return this.hasPermission(role, DoctorPermission.PRESCRIPTION_CREATE);
  }

  static canOrderLabs(role: UserRole | undefined): boolean {
    if (!role || role !== 'doctor') return false;
    return this.hasPermission(role, DoctorPermission.LAB_ORDER_CREATE);
  }

  static canViewAnalytics(role: UserRole | undefined): boolean {
    if (!role || role !== 'doctor') return false;
    return this.hasPermission(role, DoctorPermission.ANALYTICS_PERSONAL);
  }

  static canManageQueue(role: UserRole | undefined): boolean {
    if (!role || role !== 'doctor') return false;
    return this.hasPermission(role, DoctorPermission.QUEUE_MANAGE);
  }

  static getDoctorPermissions(role: UserRole | undefined): DoctorPermission[] {
    if (!role || role !== 'doctor') return [];
    return DOCTOR_PERMISSIONS['doctor'] || [];
  }
}
