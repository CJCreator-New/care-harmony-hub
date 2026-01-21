import {
  PatientAssignment,
  VitalSigns,
  Alert,
  Task,
  NurseAssessment,
  MedicationAdministration,
  CarePlan,
  ShiftHandoff,
  NurseMetrics,
  NurseDashboard,
} from '../types/nurse';
import { NurseRBACManager } from './nurseRBACManager';

export class NurseClinicalService {
  private rbacManager: NurseRBACManager;
  private nurseId: string;

  constructor(rbacManager: NurseRBACManager, nurseId: string) {
    this.rbacManager = rbacManager;
    this.nurseId = nurseId;
  }

  // Patient Assessment
  async assessPatient(patientId: string, assessmentData: Partial<NurseAssessment>): Promise<NurseAssessment> {
    if (!this.rbacManager.canAssessPatient()) {
      throw new Error('Insufficient permissions to assess patient');
    }

    const assessment: NurseAssessment = {
      id: `assess_${Date.now()}`,
      patientId,
      nurseId: this.nurseId,
      timestamp: new Date(),
      type: assessmentData.type || 'focused',
      vitalSigns: assessmentData.vitalSigns || ({} as VitalSigns),
      physicalExamination: assessmentData.physicalExamination || '',
      mentalStatus: assessmentData.mentalStatus || '',
      painLevel: assessmentData.painLevel || 0,
      mobilityStatus: assessmentData.mobilityStatus || '',
      skinIntegrity: assessmentData.skinIntegrity || '',
      nutritionStatus: assessmentData.nutritionStatus || '',
      eliminationStatus: assessmentData.eliminationStatus || '',
      psychosocialStatus: assessmentData.psychosocialStatus || '',
      riskAssessments: assessmentData.riskAssessments || [],
      carePlanUpdates: assessmentData.carePlanUpdates || [],
      alerts: assessmentData.alerts || [],
    };

    // Audit log
    console.log(`[AUDIT] Nurse ${this.nurseId} assessed patient ${patientId}`);

    return assessment;
  }

  // Record Vital Signs
  async recordVitals(patientId: string, vitals: Partial<VitalSigns>): Promise<VitalSigns> {
    if (!this.rbacManager.canRecordVitals()) {
      throw new Error('Insufficient permissions to record vitals');
    }

    const vitalSigns: VitalSigns = {
      id: `vitals_${Date.now()}`,
      patientId,
      timestamp: new Date(),
      temperature: vitals.temperature || 0,
      heartRate: vitals.heartRate || 0,
      bloodPressure: vitals.bloodPressure || '',
      respiratoryRate: vitals.respiratoryRate || 0,
      oxygenSaturation: vitals.oxygenSaturation || 0,
      bloodGlucose: vitals.bloodGlucose,
      recordedBy: this.nurseId,
      status: this.determineVitalStatus(vitals),
    };

    console.log(`[AUDIT] Nurse ${this.nurseId} recorded vitals for patient ${patientId}`);

    return vitalSigns;
  }

  // Administer Medication
  async administerMedication(
    patientId: string,
    medicationData: Partial<MedicationAdministration>
  ): Promise<MedicationAdministration> {
    if (!this.rbacManager.canAdministerMedication()) {
      throw new Error('Insufficient permissions to administer medication');
    }

    if (!this.rbacManager.canVerifyMedication()) {
      throw new Error('Medication must be verified before administration');
    }

    const medication: MedicationAdministration = {
      id: `med_${Date.now()}`,
      patientId,
      prescriptionId: medicationData.prescriptionId || '',
      medicationName: medicationData.medicationName || '',
      dosage: medicationData.dosage || '',
      route: medicationData.route || '',
      scheduledTime: medicationData.scheduledTime || new Date(),
      administeredTime: new Date(),
      administeredBy: this.nurseId,
      status: 'administered',
      verifiedBy: this.nurseId,
      patientResponse: medicationData.patientResponse,
    };

    console.log(`[AUDIT] Nurse ${this.nurseId} administered medication to patient ${patientId}`);

    return medication;
  }

  // Create/Update Care Plan
  async updateCarePlan(patientId: string, carePlanData: Partial<CarePlan>): Promise<CarePlan> {
    if (!this.rbacManager.canUpdateCarePlan()) {
      throw new Error('Insufficient permissions to update care plan');
    }

    const carePlan: CarePlan = {
      id: carePlanData.id || `plan_${Date.now()}`,
      patientId,
      createdBy: carePlanData.createdBy || this.nurseId,
      createdAt: carePlanData.createdAt || new Date(),
      updatedAt: new Date(),
      goals: carePlanData.goals || [],
      interventions: carePlanData.interventions || [],
      status: carePlanData.status || 'active',
    };

    console.log(`[AUDIT] Nurse ${this.nurseId} updated care plan for patient ${patientId}`);

    return carePlan;
  }

  // Manage Tasks
  async completeTask(taskId: string, patientId: string, notes?: string): Promise<Task> {
    const task: Task = {
      id: taskId,
      patientId,
      title: '',
      description: '',
      type: 'assessment',
      priority: 'medium',
      dueTime: new Date(),
      assignedTo: this.nurseId,
      status: 'completed',
      completedAt: new Date(),
      completedBy: this.nurseId,
      notes,
    };

    console.log(`[AUDIT] Nurse ${this.nurseId} completed task ${taskId}`);

    return task;
  }

  // Manage Alerts
  async acknowledgeAlert(alertId: string, patientId: string): Promise<Alert> {
    if (!this.rbacManager.canManageAlerts()) {
      throw new Error('Insufficient permissions to manage alerts');
    }

    const alert: Alert = {
      id: alertId,
      patientId,
      type: 'vital_abnormal',
      severity: 'high',
      message: '',
      timestamp: new Date(),
      acknowledged: true,
      acknowledgedBy: this.nurseId,
      acknowledgedAt: new Date(),
    };

    console.log(`[AUDIT] Nurse ${this.nurseId} acknowledged alert ${alertId}`);

    return alert;
  }

  // Create Clinical Notes
  async createClinicalNote(patientId: string, noteContent: string): Promise<{ id: string; timestamp: Date }> {
    if (!this.rbacManager.canCreateNotes()) {
      throw new Error('Insufficient permissions to create notes');
    }

    const note = {
      id: `note_${Date.now()}`,
      patientId,
      nurseId: this.nurseId,
      content: noteContent,
      timestamp: new Date(),
    };

    console.log(`[AUDIT] Nurse ${this.nurseId} created clinical note for patient ${patientId}`);

    return { id: note.id, timestamp: note.timestamp };
  }

  // Shift Handoff
  async createShiftHandoff(handoffData: Partial<ShiftHandoff>): Promise<ShiftHandoff> {
    const handoff: ShiftHandoff = {
      id: `handoff_${Date.now()}`,
      shiftDate: handoffData.shiftDate || new Date(),
      outgoingNurse: this.nurseId,
      incomingNurse: handoffData.incomingNurse || '',
      patients: handoffData.patients || [],
      criticalUpdates: handoffData.criticalUpdates || [],
      pendingOrders: handoffData.pendingOrders || [],
      staffingNotes: handoffData.staffingNotes || '',
      completedAt: new Date(),
      verifiedBy: this.nurseId,
    };

    console.log(`[AUDIT] Nurse ${this.nurseId} created shift handoff`);

    return handoff;
  }

  // Get Dashboard Data
  async getDashboardData(assignedPatientIds: string[]): Promise<NurseDashboard> {
    if (!this.rbacManager.canAccessNursePanel()) {
      throw new Error('Insufficient permissions to access nurse panel');
    }

    const assignedPatients: PatientAssignment[] = assignedPatientIds.map(id => ({
      id: `assign_${id}`,
      patientId: id,
      patientName: '',
      roomNumber: '',
      acuityLevel: 'medium',
      admissionTime: new Date(),
      primaryDiagnosis: '',
      allergies: [],
      activeAlerts: [],
      vitalSigns: {} as VitalSigns,
      pendingTasks: [],
    }));

    return {
      assignedPatients,
      criticalAlerts: [],
      pendingTasks: [],
      shiftSummary: {
        patientsAdmitted: 0,
        tasksCompleted: 0,
        handoffsPending: 0,
        qualityMetrics: this.getDefaultMetrics(),
      },
      communicationHub: [],
      quickActions: [],
    };
  }

  // Get Metrics
  async getMetrics(): Promise<NurseMetrics> {
    if (!this.rbacManager.canViewMetrics()) {
      throw new Error('Insufficient permissions to view metrics');
    }

    return this.getDefaultMetrics();
  }

  // Helper Methods
  private determineVitalStatus(vitals: Partial<VitalSigns>): 'normal' | 'abnormal' | 'critical' {
    const temp = vitals.temperature || 0;
    const hr = vitals.heartRate || 0;
    const rr = vitals.respiratoryRate || 0;
    const o2 = vitals.oxygenSaturation || 0;

    if (temp > 39 || temp < 35 || hr > 120 || hr < 40 || rr > 30 || rr < 8 || o2 < 90) {
      return 'critical';
    }
    if (temp > 38.5 || temp < 36 || hr > 100 || hr < 50 || rr > 25 || rr < 10 || o2 < 94) {
      return 'abnormal';
    }
    return 'normal';
  }

  private getDefaultMetrics(): NurseMetrics {
    return {
      totalPatientsAssigned: 0,
      tasksCompleted: 0,
      taskCompletionRate: 0,
      averageResponseTime: 0,
      medicationAdministrationAccuracy: 0,
      documentationTimeliness: 0,
      patientSatisfactionScore: 0,
      qualityScore: 0,
      shiftsWorked: 0,
      averagePatientAcuity: 0,
    };
  }
}
