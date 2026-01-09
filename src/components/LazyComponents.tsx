import { lazy } from 'react';

// Lazy load dashboard components
export const BusinessIntelligenceDashboard = lazy(() => 
  import('@/components/admin/BusinessIntelligenceDashboard').then(module => ({
    default: module.BusinessIntelligenceDashboard
  }))
);

export const AuditTrailDashboard = lazy(() => 
  import('@/components/admin/AuditTrailDashboard').then(module => ({
    default: module.AuditTrailDashboard
  }))
);

export const BackupRecoveryDashboard = lazy(() => 
  import('@/components/admin/BackupRecoveryDashboard').then(module => ({
    default: module.BackupRecoveryDashboard
  }))
);

export const SystemMonitoringDashboard = lazy(() => 
  import('@/components/admin/SystemMonitoringDashboard').then(module => ({
    default: module.SystemMonitoringDashboard
  }))
);

export const IntegrationDashboard = lazy(() => 
  import('@/components/admin/IntegrationDashboard').then(module => ({
    default: module.IntegrationDashboard
  }))
);

export const AIClinicalSupportDashboard = lazy(() => 
  import('@/components/doctor/AIClinicalSupportDashboard').then(module => ({
    default: module.AIClinicalSupportDashboard
  }))
);

export const VideoConsultation = lazy(() => 
  import('@/components/telemedicine/VideoConsultation').then(module => ({
    default: module.VideoConsultation
  }))
);