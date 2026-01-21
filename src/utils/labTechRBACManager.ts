import { LabTechPermission, LabTechUser } from '../types/labtech';

export class LabTechRBACManager {
  private labTechUser: LabTechUser;

  constructor(labTechUser: LabTechUser) {
    this.labTechUser = labTechUser;
  }

  // Permission checking
  hasPermission(permission: LabTechPermission): boolean {
    return this.labTechUser.permissions.includes(permission);
  }

  hasAnyPermission(permissions: LabTechPermission[]): boolean {
    return permissions.some(p => this.labTechUser.permissions.includes(p));
  }

  hasAllPermissions(permissions: LabTechPermission[]): boolean {
    return permissions.every(p => this.labTechUser.permissions.includes(p));
  }

  // Lab Panel Access
  canAccessLabPanel(): boolean {
    return this.labTechUser.isActive && this.labTechUser.permissions.length > 0;
  }

  // Specimen Management Access
  canReceiveSpecimen(): boolean {
    return this.hasPermission(LabTechPermission.SPECIMEN_RECEIVE);
  }

  canProcessSpecimen(): boolean {
    return this.hasPermission(LabTechPermission.SPECIMEN_PROCESS);
  }

  canRejectSpecimen(): boolean {
    return this.hasPermission(LabTechPermission.SPECIMEN_REJECT);
  }

  // Testing Operations Access
  canPerformTest(): boolean {
    return this.hasPermission(LabTechPermission.TEST_PERFORM);
  }

  canVerifyTest(): boolean {
    return this.hasPermission(LabTechPermission.TEST_VERIFY);
  }

  canReviewResult(): boolean {
    return this.hasPermission(LabTechPermission.RESULT_REVIEW);
  }

  canApproveResult(): boolean {
    return this.hasPermission(LabTechPermission.RESULT_APPROVE);
  }

  // Quality Control Access
  canPerformQC(): boolean {
    return this.hasPermission(LabTechPermission.QC_PERFORM);
  }

  canReviewQC(): boolean {
    return this.hasPermission(LabTechPermission.QC_REVIEW);
  }

  canLogMaintenance(): boolean {
    return this.hasPermission(LabTechPermission.MAINTENANCE_LOG);
  }

  // Analyzer Management Access
  canOperateAnalyzer(): boolean {
    return this.hasPermission(LabTechPermission.ANALYZER_OPERATE);
  }

  canCalibrateAnalyzer(): boolean {
    return this.hasPermission(LabTechPermission.ANALYZER_CALIBRATE);
  }

  // Communication Access
  canCommunicateResults(): boolean {
    return this.hasPermission(LabTechPermission.RESULT_COMMUNICATE);
  }

  // Analytics Access
  canViewMetrics(): boolean {
    return this.hasPermission(LabTechPermission.METRICS_VIEW);
  }

  // Dashboard Tab Visibility
  getVisibleTabs(): string[] {
    const tabs: string[] = ['specimens'];

    if (this.canPerformTest()) tabs.push('testing');
    if (this.canPerformQC()) tabs.push('quality');
    if (this.canOperateAnalyzer()) tabs.push('analyzers');
    if (this.canReviewResult()) tabs.push('results');
    if (this.canViewMetrics()) tabs.push('metrics');

    return tabs;
  }

  // Get accessible actions for specimens
  getSpecimenActions(): string[] {
    const actions: string[] = [];

    if (this.canReceiveSpecimen()) actions.push('receive');
    if (this.canProcessSpecimen()) actions.push('process');
    if (this.canRejectSpecimen()) actions.push('reject');

    return actions;
  }

  // Get accessible actions for testing
  getTestingActions(): string[] {
    const actions: string[] = [];

    if (this.canPerformTest()) actions.push('perform');
    if (this.canVerifyTest()) actions.push('verify');
    if (this.canReviewResult()) actions.push('review');
    if (this.canApproveResult()) actions.push('approve');

    return actions;
  }

  // Get user info
  getUserInfo() {
    return {
      id: this.labTechUser.id,
      name: this.labTechUser.name,
      email: this.labTechUser.email,
      department: this.labTechUser.department,
      shift: this.labTechUser.shift,
      certificationNumber: this.labTechUser.certificationNumber,
      certifications: this.labTechUser.certifications,
      permissions: this.labTechUser.permissions,
      isActive: this.labTechUser.isActive,
    };
  }
}
