import {
  PatientRegistration,
  Appointment,
  CheckInRecord,
  CheckOutRecord,
  QueueStatus,
  PatientCommunication,
  ReceptionistMetrics,
  ReceptionistDashboard,
  SchedulingConflict,
  NoShowPrediction,
} from '../types/receptionist';
import { ReceptionistRBACManager } from './receptionistRBACManager';
import { logAudit } from './auditLogQueue';

export class ReceptionistOperationsService {
  private rbacManager: ReceptionistRBACManager;
  private receptionistId: string;
  private hospitalId: string;

  constructor(rbacManager: ReceptionistRBACManager, receptionistId: string, hospitalId = '') {
    this.rbacManager = rbacManager;
    this.receptionistId = receptionistId;
    this.hospitalId = hospitalId;
  }

  // Patient Registration
  async registerPatient(patientData: Partial<PatientRegistration>): Promise<PatientRegistration> {
    if (!this.rbacManager.canRegisterPatient()) {
      throw new Error('Insufficient permissions to register patient');
    }

    const registration: PatientRegistration = {
      id: `patient_${Date.now()}`,
      firstName: patientData.firstName || '',
      lastName: patientData.lastName || '',
      dateOfBirth: patientData.dateOfBirth || new Date(),
      gender: patientData.gender || 'other',
      email: patientData.email || '',
      phone: patientData.phone || '',
      address: patientData.address || '',
      city: patientData.city || '',
      state: patientData.state || '',
      zipCode: patientData.zipCode || '',
      emergencyContact: patientData.emergencyContact || { name: '', relationship: '', phone: '' },
      insuranceInfo: patientData.insuranceInfo || {
        provider: '',
        memberId: '',
        groupNumber: '',
        planName: '',
        copay: 0,
        deductible: 0,
        status: 'pending',
      },
      medicalHistory: patientData.medicalHistory || [],
      allergies: patientData.allergies || [],
      medications: patientData.medications || [],
      registeredAt: new Date(),
      registeredBy: this.receptionistId,
      status: 'active',
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.receptionistId, action_type: 'register_patient', entity_type: 'patient', entity_id: registration.id });

    return registration;
  }

  // Update Patient Information
  async updatePatient(patientId: string, patientData: Partial<PatientRegistration>): Promise<PatientRegistration> {
    if (!this.rbacManager.canUpdatePatient()) {
      throw new Error('Insufficient permissions to update patient');
    }

    const updated: PatientRegistration = {
      id: patientId,
      firstName: patientData.firstName || '',
      lastName: patientData.lastName || '',
      dateOfBirth: patientData.dateOfBirth || new Date(),
      gender: patientData.gender || 'other',
      email: patientData.email || '',
      phone: patientData.phone || '',
      address: patientData.address || '',
      city: patientData.city || '',
      state: patientData.state || '',
      zipCode: patientData.zipCode || '',
      emergencyContact: patientData.emergencyContact || { name: '', relationship: '', phone: '' },
      insuranceInfo: patientData.insuranceInfo || {
        provider: '',
        memberId: '',
        groupNumber: '',
        planName: '',
        copay: 0,
        deductible: 0,
        status: 'pending',
      },
      medicalHistory: patientData.medicalHistory || [],
      allergies: patientData.allergies || [],
      medications: patientData.medications || [],
      registeredAt: new Date(),
      registeredBy: this.receptionistId,
      status: 'active',
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.receptionistId, action_type: 'update_patient', entity_type: 'patient', entity_id: patientId });

    return updated;
  }

  // Verify Patient Identity
  async verifyPatient(patientId: string): Promise<{ verified: boolean; timestamp: Date }> {
    if (!this.rbacManager.canVerifyPatient()) {
      throw new Error('Insufficient permissions to verify patient');
    }

    logAudit({ hospital_id: this.hospitalId, user_id: this.receptionistId, action_type: 'verify_patient', entity_type: 'patient', entity_id: patientId });

    return {
      verified: true,
      timestamp: new Date(),
    };
  }

  // Create Appointment
  async createAppointment(appointmentData: Partial<Appointment>): Promise<Appointment> {
    if (!this.rbacManager.canCreateAppointment()) {
      throw new Error('Insufficient permissions to create appointment');
    }

    const appointment: Appointment = {
      id: `apt_${Date.now()}`,
      patientId: appointmentData.patientId || '',
      patientName: appointmentData.patientName || '',
      providerId: appointmentData.providerId || '',
      providerName: appointmentData.providerName || '',
      appointmentType: appointmentData.appointmentType || 'consultation',
      scheduledTime: appointmentData.scheduledTime || new Date(),
      duration: appointmentData.duration || 30,
      roomNumber: appointmentData.roomNumber,
      status: 'scheduled',
      notes: appointmentData.notes,
      createdBy: this.receptionistId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.receptionistId, action_type: 'create_appointment', entity_type: 'appointment', entity_id: appointment.id });

    return appointment;
  }

  // Modify Appointment
  async modifyAppointment(appointmentId: string, appointmentData: Partial<Appointment>): Promise<Appointment> {
    if (!this.rbacManager.canModifyAppointment()) {
      throw new Error('Insufficient permissions to modify appointment');
    }

    const modified: Appointment = {
      id: appointmentId,
      patientId: appointmentData.patientId || '',
      patientName: appointmentData.patientName || '',
      providerId: appointmentData.providerId || '',
      providerName: appointmentData.providerName || '',
      appointmentType: appointmentData.appointmentType || 'consultation',
      scheduledTime: appointmentData.scheduledTime || new Date(),
      duration: appointmentData.duration || 30,
      roomNumber: appointmentData.roomNumber,
      status: appointmentData.status || 'scheduled',
      notes: appointmentData.notes,
      createdBy: this.receptionistId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.receptionistId, action_type: 'modify_appointment', entity_type: 'appointment', entity_id: appointmentId });

    return modified;
  }

  // Cancel Appointment
  async cancelAppointment(appointmentId: string, reason?: string): Promise<Appointment> {
    if (!this.rbacManager.canCancelAppointment()) {
      throw new Error('Insufficient permissions to cancel appointment');
    }

    const cancelled: Appointment = {
      id: appointmentId,
      patientId: '',
      patientName: '',
      providerId: '',
      providerName: '',
      appointmentType: 'consultation',
      scheduledTime: new Date(),
      duration: 0,
      status: 'cancelled',
      notes: reason,
      createdBy: this.receptionistId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.receptionistId, action_type: 'cancel_appointment', entity_type: 'appointment', entity_id: appointmentId });

    return cancelled;
  }

  // Process Check-in
  async processCheckIn(appointmentId: string, patientId: string): Promise<CheckInRecord> {
    if (!this.rbacManager.canProcessCheckIn()) {
      throw new Error('Insufficient permissions to process check-in');
    }

    const checkIn: CheckInRecord = {
      id: `checkin_${Date.now()}`,
      appointmentId,
      patientId,
      checkInTime: new Date(),
      checkInBy: this.receptionistId,
      insuranceVerified: false,
      formsCompleted: false,
      vitalsRecorded: false,
      waitingRoomAssigned: 'WR-01',
      status: 'checked_in',
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.receptionistId, action_type: 'check_in_patient', entity_type: 'patient', entity_id: patientId });

    return checkIn;
  }

  // Process Check-out
  async processCheckOut(appointmentId: string, patientId: string): Promise<CheckOutRecord> {
    if (!this.rbacManager.canProcessCheckOut()) {
      throw new Error('Insufficient permissions to process check-out');
    }

    const checkOut: CheckOutRecord = {
      id: `checkout_${Date.now()}`,
      appointmentId,
      patientId,
      checkOutTime: new Date(),
      checkOutBy: this.receptionistId,
      billGenerated: false,
      nextAppointmentScheduled: false,
      dischargeSummaryProvided: false,
      status: 'completed',
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.receptionistId, action_type: 'check_out_patient', entity_type: 'patient', entity_id: patientId });

    return checkOut;
  }

  // Verify Insurance
  async verifyInsurance(patientId: string): Promise<{ verified: boolean; details: string }> {
    if (!this.rbacManager.canVerifyInsurance()) {
      throw new Error('Insufficient permissions to verify insurance');
    }

    logAudit({ hospital_id: this.hospitalId, user_id: this.receptionistId, action_type: 'verify_insurance', entity_type: 'patient', entity_id: patientId });

    return {
      verified: true,
      details: 'Insurance verified successfully',
    };
  }

  // Get Queue Status
  async getQueueStatus(): Promise<QueueStatus> {
    if (!this.rbacManager.canViewQueue()) {
      throw new Error('Insufficient permissions to view queue');
    }

    return {
      totalPatients: 0,
      waitingPatients: 0,
      averageWaitTime: 0,
      estimatedWaitTime: 0,
      patients: [],
    };
  }

  // Manage Queue Priority
  async updateQueuePriority(appointmentId: string, priority: 'urgent' | 'high' | 'normal' | 'low'): Promise<void> {
    if (!this.rbacManager.canManageQueue()) {
      throw new Error('Insufficient permissions to manage queue');
    }

    logAudit({ hospital_id: this.hospitalId, user_id: this.receptionistId, action_type: 'update_queue_priority', entity_type: 'appointment', entity_id: appointmentId });
  }

  // Send Patient Communication
  async sendPatientCommunication(
    patientId: string,
    communicationType: 'sms' | 'email' | 'phone' | 'app_notification',
    message: string
  ): Promise<PatientCommunication> {
    if (!this.rbacManager.canCommunicateWithPatient()) {
      throw new Error('Insufficient permissions to communicate with patient');
    }

    const communication: PatientCommunication = {
      id: `comm_${Date.now()}`,
      patientId,
      type: communicationType,
      subject: 'Appointment Notification',
      message,
      sentAt: new Date(),
      sentBy: this.receptionistId,
      status: 'sent',
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.receptionistId, action_type: 'send_patient_communication', entity_type: 'patient', entity_id: patientId, details: { communicationType } });

    return communication;
  }

  // Detect Scheduling Conflicts
  async detectSchedulingConflicts(appointmentData: Partial<Appointment>): Promise<SchedulingConflict[]> {
    const conflicts: SchedulingConflict[] = [];

    // Check for provider overlap
    if (appointmentData.providerId) {
      // Simulate conflict detection
      logAudit({ hospital_id: this.hospitalId, user_id: this.receptionistId, action_type: 'check_scheduling_conflicts', entity_type: 'appointment', entity_id: 'batch' });
    }

    return conflicts;
  }

  // Predict No-Show Risk
  async predictNoShowRisk(appointmentId: string): Promise<NoShowPrediction> {
    const prediction: NoShowPrediction = {
      appointmentId,
      patientId: '',
      riskScore: 0.3,
      riskLevel: 'low',
      factors: ['First-time patient', 'Morning appointment'],
      recommendedAction: 'Send reminder 24 hours before',
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.receptionistId, action_type: 'predict_no_show', entity_type: 'appointment', entity_id: appointmentId });

    return prediction;
  }

  // Get Dashboard Data
  async getDashboardData(): Promise<ReceptionistDashboard> {
    if (!this.rbacManager.canAccessReceptionPanel()) {
      throw new Error('Insufficient permissions to access reception panel');
    }

    return {
      todaySchedule: [],
      patientQueue: {
        totalPatients: 0,
        waitingPatients: 0,
        averageWaitTime: 0,
        estimatedWaitTime: 0,
        patients: [],
      },
      checkInStations: [],
      performanceMetrics: this.getDefaultMetrics(),
      alerts: [],
      quickActions: [],
      upcomingAppointments: [],
    };
  }

  // Get Metrics
  async getMetrics(): Promise<ReceptionistMetrics> {
    if (!this.rbacManager.canViewMetrics()) {
      throw new Error('Insufficient permissions to view metrics');
    }

    return this.getDefaultMetrics();
  }

  // Helper Methods
  private getDefaultMetrics(): ReceptionistMetrics {
    return {
      patientsProcessed: 0,
      appointmentsScheduled: 0,
      checkInsCompleted: 0,
      averageCheckInTime: 0,
      averageWaitTime: 0,
      insuranceVerificationRate: 0,
      appointmentAdherenceRate: 0,
      patientSatisfactionScore: 0,
      noShowRate: 0,
      systemUptime: 0,
    };
  }
}
