import { lazy } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureFlags, type FeatureFlagName } from '@/hooks/useFeatureFlags';
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import type { Permission } from '@/lib/permissions';
import type { UserRole } from '@/types/auth';
import { getDevTestRole } from '@/utils/devRoleSwitch';

const LandingPage = lazy(() => import('../pages/hospital/LandingPage'));
const LoginPage = lazy(() => import('../pages/hospital/LoginPage'));
const SignupPage = lazy(() => import('../pages/hospital/SignupPage'));
const ForgotPasswordPage = lazy(() => import('../pages/hospital/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/hospital/ResetPasswordPage'));
const JoinPage = lazy(() => import('../pages/hospital/JoinPage'));
const ProfileSetupPage = lazy(() => import('../pages/hospital/ProfileSetupPage'));
const AdminRoleSetupPage = lazy(() => import('../pages/hospital/AdminRoleSetupPage'));
const AccountSetupPage = lazy(() => import('../pages/hospital/AccountSetupPage'));
const QuickAccessPage = lazy(() => import('../pages/hospital/QuickAccessPage'));
const RoleSelectionPage = lazy(() => import('../pages/hospital/RoleSelectionPage'));
const PatientRegisterPage = lazy(() => import('../pages/patient/PatientRegisterPage'));
const PatientLoginPage = lazy(() => import('../pages/patient/PatientLoginPage'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const PatientsPage = lazy(() => import('../pages/patients/PatientsPage'));
const PatientProfilePage = lazy(() => import('../pages/patients/PatientProfilePage'));
const StaffManagementPage = lazy(() => import('../pages/settings/StaffManagementPage'));
const StaffPerformancePage = lazy(() => import('../pages/settings/StaffPerformancePage'));
const HospitalSettingsPage = lazy(() => import('../pages/settings/HospitalSettingsPage'));
const ActivityLogsPage = lazy(() => import('../pages/settings/ActivityLogsPage'));
const UserProfilePage = lazy(() => import('../pages/settings/UserProfilePage'));
const SystemMonitoringPage = lazy(() => import('../pages/settings/SystemMonitoringPage'));
const ConsultationsPage = lazy(() => import('../pages/consultations/ConsultationsPage'));
const ConsultationWorkflowPage = lazy(() => import('../pages/consultations/ConsultationWorkflowPage'));
const MobileConsultationPage = lazy(() => import('../pages/consultations/MobileConsultationPage'));
const AppointmentsPage = lazy(() => import('../pages/appointments/AppointmentsPage'));
const LaboratoryPage = lazy(() => import('../pages/laboratory/LaboratoryPage'));
const PharmacyPage = lazy(() => import('../pages/pharmacy/PharmacyPage'));
const PharmacyQueuePage = lazy(() => import('../pages/pharmacy/PharmacyQueuePage'));
const DoctorDashboard = lazy(() => import('../pages/doctor/DoctorDashboard'));
const NurseMedicationsPage = lazy(() => import('../pages/nurse/NurseMedicationsPage'));
const QueueManagementPage = lazy(() => import('../pages/queue/QueueManagementPage'));
const BillingPage = lazy(() => import('../pages/billing/BillingPage'));
const InventoryPage = lazy(() => import('../pages/inventory/InventoryPage'));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage'));
const PatientAppointmentsPage = lazy(() => import('../pages/patient/PatientAppointmentsPage'));
const PatientPrescriptionsPage = lazy(() => import('../pages/patient/PatientPrescriptionsPage'));
const PatientLabResultsPage = lazy(() => import('../pages/patient/PatientLabResultsPage'));
const PatientMedicalHistoryPage = lazy(() => import('../pages/patient/PatientMedicalHistoryPage'));
const EnhancedPortalPage = lazy(() => import('../pages/patient/EnhancedPortalPage'));
const PatientMessagesPage = lazy(() => import('../pages/patient/PatientMessagesPage'));
const DoctorMessagesPage = lazy(() => import('../pages/messaging/DoctorMessagesPage'));
const TelemedicinePage = lazy(() => import('../pages/telemedicine/TelemedicinePage'));
const SuppliersPage = lazy(() => import('../pages/suppliers/SuppliersPage'));
const SchedulingPage = lazy(() => import('../pages/scheduling/SchedulingPage'));
const NotificationsPage = lazy(() => import('../pages/notifications/NotificationsPage'));
const DocumentsPage = lazy(() => import('../pages/documents/DocumentsPage'));
const NurseCareProtocolsPage = lazy(() => import('../pages/nurse/NurseCareProtocolsPage'));
const SmartSchedulerPage = lazy(() => import('../pages/receptionist/SmartSchedulerPage'));
const ClinicalPharmacyPage = lazy(() => import('../pages/pharmacy/ClinicalPharmacyPage'));
const LabAutomationPage = lazy(() => import('../pages/lab/LabAutomationPage'));
const WorkflowDashboard = lazy(() => import('../pages/integration/WorkflowDashboard'));
const WorkflowOptimizationPage = lazy(() => import('../pages/workflow/WorkflowOptimizationPage'));
const DischargeWorkflowPage = lazy(() => import('../pages/workflow/DischargeWorkflowPage'));
const TestingDashboardPage = lazy(() => import('../pages/testing/TestingDashboardPage'));
const AIDemoPage = lazy(() => import('../pages/AIDemoPage'));
const DifferentialDiagnosisPage = lazy(() => import('../pages/DifferentialDiagnosisPage'));
const TreatmentRecommendationsPage = lazy(() => import('../pages/TreatmentRecommendationsPage'));
const TreatmentPlanOptimizationPage = lazy(() => import('../pages/TreatmentPlanOptimizationPage'));
const PredictiveAnalyticsPage = lazy(() => import('../pages/PredictiveAnalyticsPage'));
const LengthOfStayForecastingPage = lazy(() => import('../pages/LengthOfStayForecastingPage'));
const ResourceUtilizationOptimizationPage = lazy(() => import('../pages/ResourceUtilizationOptimizationPage'));
const VoiceClinicalNotesPage = lazy(() => import('../pages/VoiceClinicalNotesPage'));
const NotFound = lazy(() => import('../pages/NotFound'));

export type RouteDefinition = {
  path: string;
  element: React.ReactNode;
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isProfileReady, profile, hospital, roles, pendingRoleSelection } = useAuth();
  const persistedTestRole = getDevTestRole(roles);
  const effectiveRoleCount = persistedTestRole ? 1 : roles.length;

  if (isLoading) {
    if (isAuthenticated) {
      return (
        <DashboardLayout>
          <div className="min-h-[70vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DashboardLayout>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/hospital/login" replace />;
  if (!isProfileReady) {
    return (
      <DashboardLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const needsSetup = !profile || !hospital;
  if (needsSetup) return <Navigate to="/hospital/account-setup" replace />;

  if (effectiveRoleCount === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
          <div className="bg-destructive/10 text-destructive p-3 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <path d="M12 9v4"/>
              <path d="M12 17h.01"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">No Active Roles</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            You don't have any roles assigned yet, or your role is unknown. 
            <br />
            Please use the Test Mode indicator to switch roles, or contact your administrator.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (pendingRoleSelection) return <Navigate to="/hospital/select-role" replace />;

  return <>{children}</>;
}

function RoleSelectionRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isProfileReady, pendingRoleSelection } = useAuth();

  if (isLoading || !isProfileReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/hospital/login" replace />;
  if (!pendingRoleSelection) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, pendingRoleSelection } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={pendingRoleSelection ? '/hospital/select-role' : '/dashboard'} replace />;
  }
  return <>{children}</>;
}

function FeatureFlagRoute({
  children,
  flagName,
  redirectTo = '/dashboard',
}: {
  children: React.ReactNode;
  flagName: FeatureFlagName;
  redirectTo?: string;
}) {
  const { isLoading, isEnabled } = useFeatureFlags();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }
  if (!isEnabled(flagName)) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}

function withRoleAccess(
  page: React.ReactNode,
  allowedRoles: UserRole[],
  requiredPermission?: Permission,
  featureFlag?: FeatureFlagName,
) {
  const content = (
    <RoleProtectedRoute allowedRoles={allowedRoles} requiredPermission={requiredPermission}>
      {page}
    </RoleProtectedRoute>
  );

  return featureFlag ? <FeatureFlagRoute flagName={featureFlag}>{content}</FeatureFlagRoute> : content;
}

export const redirectRoutes: RouteDefinition[] = [
  { path: '/', element: <Navigate to="/hospital" replace /> },
  { path: '/login', element: <Navigate to="/hospital/login" replace /> },
  { path: '/auth/login', element: <Navigate to="/hospital/login" replace /> },
  { path: '/signup', element: <Navigate to="/hospital/signup" replace /> },
  { path: '/register', element: <Navigate to="/hospital/signup" replace /> },
  { path: '/forgot-password', element: <Navigate to="/hospital/forgot-password" replace /> },
  { path: '/patient/login', element: <Navigate to="/patient-login" replace /> },
  { path: '/patient/register', element: <Navigate to="/patient-register" replace /> },
  { path: '/patient/forgot-password', element: <Navigate to="/hospital/forgot-password" replace /> },
  { path: '/admin/dashboard', element: <Navigate to="/dashboard" replace /> },
  { path: '/doctor/dashboard', element: <Navigate to="/dashboard" replace /> },
  { path: '/dashboard/nurse', element: <Navigate to="/dashboard" replace /> },
  { path: '/patient/dashboard', element: <Navigate to="/patient/portal" replace /> },
  { path: '/pharmacy/prescriptions', element: <Navigate to="/pharmacy" replace /> },
  { path: '/clinical-pharmacy', element: <Navigate to="/pharmacy/clinical" replace /> },
  { path: '/lab/orders', element: <Navigate to="/laboratory" replace /> },
  { path: '/pharmacy/inventory', element: <Navigate to="/inventory" replace /> },
  { path: '/staff', element: <Navigate to="/settings/staff" replace /> },
  { path: '/settings/staff-management', element: <Navigate to="/settings/staff" replace /> },
  { path: '/admin/settings', element: <Navigate to="/settings" replace /> },
  { path: '/treatment-plan-optimizer', element: <Navigate to="/treatment-plan-optimization" replace /> },
  { path: '/length-of-stay-forecast', element: <Navigate to="/length-of-stay-forecasting" replace /> },
  { path: '/resource-utilization', element: <Navigate to="/resource-utilization-optimization" replace /> },
  { path: '/analytics', element: <Navigate to="/reports" replace /> },
];

export const publicRoutes: RouteDefinition[] = [
  { path: '/hospital', element: <PublicRoute><LandingPage /></PublicRoute> },
  { path: '/hospital/login', element: <PublicRoute><LoginPage /></PublicRoute> },
  { path: '/hospital/signup', element: <PublicRoute><SignupPage /></PublicRoute> },
  { path: '/hospital/forgot-password', element: <PublicRoute><ForgotPasswordPage /></PublicRoute> },
  { path: '/hospital/reset-password', element: <ResetPasswordPage /> },
  { path: '/hospital/select-role', element: <RoleSelectionRoute><RoleSelectionPage /></RoleSelectionRoute> },
  { path: '/hospital/join/:token', element: <PublicRoute><JoinPage /></PublicRoute> },
  { path: '/quick-access', element: <QuickAccessPage /> },
  { path: '/patient-register', element: <PublicRoute><PatientRegisterPage /></PublicRoute> },
  { path: '/patient-login', element: <PublicRoute><PatientLoginPage /></PublicRoute> },
  { path: '/hospital/profile-setup', element: <ProtectedRoute><ProfileSetupPage /></ProtectedRoute> },
  { path: '/hospital/role-setup', element: <ProtectedRoute><AdminRoleSetupPage /></ProtectedRoute> },
  { path: '/hospital/account-setup', element: <AccountSetupPage /> },
  { path: '/dashboard', element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
  { path: '/profile', element: <ProtectedRoute><UserProfilePage /></ProtectedRoute> },
  { path: '/notifications', element: <ProtectedRoute><NotificationsPage /></ProtectedRoute> },
];

export const protectedRoutes: RouteDefinition[] = [
  { path: '/patients', element: withRoleAccess(<PatientsPage />, ['admin', 'doctor', 'nurse', 'receptionist'], 'patients') },
  { path: '/patients/:id', element: withRoleAccess(<PatientProfilePage />, ['admin', 'doctor', 'nurse', 'receptionist']) },
  { path: '/appointments', element: withRoleAccess(<AppointmentsPage />, ['admin', 'doctor', 'nurse', 'receptionist'], 'appointments') },
  { path: '/consultations', element: withRoleAccess(<ConsultationsPage />, ['admin', 'doctor', 'nurse'], 'consultations:read') },
  { path: '/consultations/mobile', element: withRoleAccess(<MobileConsultationPage />, ['admin', 'doctor']) },
  { path: '/consultations/:id', element: withRoleAccess(<ConsultationWorkflowPage />, ['admin', 'doctor', 'nurse']) },
  { path: '/pharmacy', element: withRoleAccess(<PharmacyPage />, ['admin', 'pharmacist'], 'pharmacy') },
  { path: '/hospital/doctor/dashboard', element: withRoleAccess(<DoctorDashboard />, ['doctor']) },
  { path: '/hospital/pharmacy/queue', element: withRoleAccess(<PharmacyQueuePage />, ['pharmacist']) },
  { path: '/hospital/nurse/medications', element: withRoleAccess(<NurseMedicationsPage />, ['nurse']) },
  { path: '/pharmacy/clinical', element: withRoleAccess(<ClinicalPharmacyPage />, ['admin', 'pharmacist'], 'clinical-pharmacy') },
  { path: '/queue', element: withRoleAccess(<QueueManagementPage />, ['admin', 'doctor', 'nurse', 'receptionist'], 'queue:read') },
  { path: '/laboratory', element: withRoleAccess(<LaboratoryPage />, ['admin', 'doctor', 'nurse', 'lab_technician'], 'lab:read') },
  { path: '/laboratory/automation', element: withRoleAccess(<LabAutomationPage />, ['admin', 'lab_technician']) },
  { path: '/billing', element: withRoleAccess(<BillingPage />, ['admin', 'receptionist'], 'billing:read') },
  { path: '/inventory', element: withRoleAccess(<InventoryPage />, ['admin', 'pharmacist'], 'inventory:read') },
  { path: '/reports', element: withRoleAccess(<ReportsPage />, ['admin'], 'reports') },
  { path: '/patient/appointments', element: withRoleAccess(<PatientAppointmentsPage />, ['patient'], 'appointments:read') },
  { path: '/patient/prescriptions', element: withRoleAccess(<PatientPrescriptionsPage />, ['patient'], 'prescriptions:read') },
  { path: '/patient/lab-results', element: withRoleAccess(<PatientLabResultsPage />, ['patient'], 'lab:read') },
  { path: '/patient/medical-history', element: withRoleAccess(<PatientMedicalHistoryPage />, ['patient']) },
  { path: '/patient/portal', element: withRoleAccess(<EnhancedPortalPage />, ['patient'], 'portal') },
  { path: '/patient/messages', element: withRoleAccess(<PatientMessagesPage />, ['patient']) },
  { path: '/messages', element: withRoleAccess(<DoctorMessagesPage />, ['admin', 'doctor', 'nurse', 'pharmacist', 'lab_technician']) },
  { path: '/telemedicine', element: withRoleAccess(<TelemedicinePage />, ['admin', 'doctor', 'nurse'], 'telemedicine:read') },
  { path: '/settings', element: withRoleAccess(<HospitalSettingsPage />, ['admin'], 'settings') },
  { path: '/settings/staff', element: withRoleAccess(<StaffManagementPage />, ['admin'], 'staff-management') },
  { path: '/settings/performance', element: withRoleAccess(<StaffPerformancePage />, ['admin'], 'staff-performance') },
  { path: '/settings/activity', element: withRoleAccess(<ActivityLogsPage />, ['admin'], 'activity-logs') },
  { path: '/settings/monitoring', element: withRoleAccess(<SystemMonitoringPage />, ['admin'], 'system-monitoring') },
  { path: '/ai-demo', element: withRoleAccess(<AIDemoPage />, ['admin', 'doctor'], undefined, 'ai_demo') },
  { path: '/differential-diagnosis', element: withRoleAccess(<DifferentialDiagnosisPage />, ['admin', 'doctor'], undefined, 'ai_clinical_tools') },
  { path: '/treatment-recommendations', element: withRoleAccess(<TreatmentRecommendationsPage />, ['admin', 'doctor'], undefined, 'ai_clinical_tools') },
  { path: '/treatment-plan-optimization', element: withRoleAccess(<TreatmentPlanOptimizationPage />, ['admin', 'doctor'], undefined, 'ai_clinical_tools') },
  { path: '/predictive-analytics', element: withRoleAccess(<PredictiveAnalyticsPage />, ['admin', 'doctor'], undefined, 'ai_analytics') },
  { path: '/length-of-stay-forecasting', element: withRoleAccess(<LengthOfStayForecastingPage />, ['admin', 'doctor'], undefined, 'ai_analytics') },
  { path: '/resource-utilization-optimization', element: withRoleAccess(<ResourceUtilizationOptimizationPage />, ['admin', 'doctor'], undefined, 'ai_analytics') },
  { path: '/voice-clinical-notes', element: withRoleAccess(<VoiceClinicalNotesPage />, ['admin', 'doctor', 'nurse']) },
  { path: '/suppliers', element: withRoleAccess(<SuppliersPage />, ['admin', 'pharmacist']) },
  { path: '/scheduling', element: withRoleAccess(<SchedulingPage />, ['admin', 'doctor', 'receptionist']) },
  { path: '/documents', element: withRoleAccess(<DocumentsPage />, ['admin', 'doctor', 'nurse', 'receptionist']) },
  { path: '/scheduler', element: withRoleAccess(<SmartSchedulerPage />, ['admin', 'receptionist']) },
  { path: '/receptionist/smart-scheduler', element: withRoleAccess(<SmartSchedulerPage />, ['admin', 'receptionist']) },
  { path: '/nurse/protocols', element: withRoleAccess(<NurseCareProtocolsPage />, ['admin', 'nurse']) },
  { path: '/integration/workflow', element: withRoleAccess(<WorkflowDashboard />, ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'], 'workflow-dashboard') },
  { path: '/workflow/optimization', element: withRoleAccess(<WorkflowOptimizationPage />, ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician']) },
  { path: '/workflow/discharge', element: withRoleAccess(<DischargeWorkflowPage />, ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist']) },
  { path: '/testing', element: withRoleAccess(<TestingDashboardPage />, ['admin'], undefined, 'testing_dashboard') },
];

export const fallbackRoute = <Route path="*" element={<NotFound />} />;

export function renderRoutes(definitions: RouteDefinition[]) {
  return definitions.map((route) => <Route key={route.path} path={route.path} element={route.element} />);
}
