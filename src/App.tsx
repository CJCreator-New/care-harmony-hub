import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TestingProvider } from "@/contexts/TestingContext";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { usePerformanceMonitoring } from "@/hooks/usePerformanceMonitoring";
import { lazy, Suspense } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Loading component
// BUG-32: Full-screen layout-aware skeleton shown while lazy page chunks download,
// instead of a plain spinner that hides the app shell for 3-4 seconds.
const DashboardLoadingFallback = () => (
  <div className="min-h-screen bg-background flex">
    {/* Sidebar skeleton */}
    <div className="hidden lg:flex flex-col w-64 border-r border-border shrink-0">
      <div className="h-16 border-b border-border flex items-center px-4 gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/20 animate-pulse" />
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
      </div>
      <div className="p-3 space-y-1 flex-1">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-9 rounded-md bg-muted animate-pulse"
            style={{ animationDelay: `${i * 80}ms`, opacity: 1 - i * 0.08 }}
          />
        ))}
      </div>
    </div>
    {/* Content area skeleton */}
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="h-16 bg-card border-b border-border shrink-0" />
      <div className="flex-1 p-4 lg:p-6 space-y-4">
        <div className="h-7 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-muted animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Lazy loaded pages
const LandingPage = lazy(() => import("./pages/hospital/LandingPage"));
const LoginPage = lazy(() => import("./pages/hospital/LoginPage"));
const SignupPage = lazy(() => import("./pages/hospital/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/hospital/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/hospital/ResetPasswordPage"));
const JoinPage = lazy(() => import("./pages/hospital/JoinPage"));
const ProfileSetupPage = lazy(() => import("./pages/hospital/ProfileSetupPage"));
const AdminRoleSetupPage = lazy(() => import("./pages/hospital/AdminRoleSetupPage"));
const AccountSetupPage = lazy(() => import("./pages/hospital/AccountSetupPage"));
const QuickAccessPage = lazy(() => import("./pages/hospital/QuickAccessPage"));
const PatientRegisterPage = lazy(() => import("./pages/patient/PatientRegisterPage"));
const PatientLoginPage = lazy(() => import("./pages/patient/PatientLoginPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PatientsPage = lazy(() => import("./pages/patients/PatientsPage"));
const PatientProfilePage = lazy(() => import("./pages/patients/PatientProfilePage"));
const StaffManagementPage = lazy(() => import("./pages/settings/StaffManagementPage"));
const StaffPerformancePage = lazy(() => import("./pages/settings/StaffPerformancePage"));
const HospitalSettingsPage = lazy(() => import("./pages/settings/HospitalSettingsPage"));
const ActivityLogsPage = lazy(() => import("./pages/settings/ActivityLogsPage"));
const UserProfilePage = lazy(() => import("./pages/settings/UserProfilePage"));
const SystemMonitoringPage = lazy(() => import("./pages/settings/SystemMonitoringPage"));
const ConsultationsPage = lazy(() => import("./pages/consultations/ConsultationsPage"));
const ConsultationWorkflowPage = lazy(() => import("./pages/consultations/ConsultationWorkflowPage"));
const MobileConsultationPage = lazy(() => import("./pages/consultations/MobileConsultationPage"));
const AppointmentsPage = lazy(() => import("./pages/appointments/AppointmentsPage"));
const LaboratoryPage = lazy(() => import("./pages/laboratory/LaboratoryPage"));
const PharmacyPage = lazy(() => import("./pages/pharmacy/PharmacyPage"));
const QueueManagementPage = lazy(() => import("./pages/queue/QueueManagementPage"));
const BillingPage = lazy(() => import("./pages/billing/BillingPage"));
const InventoryPage = lazy(() => import("./pages/inventory/InventoryPage"));
const ReportsPage = lazy(() => import("./pages/reports/ReportsPage"));
const PatientAppointmentsPage = lazy(() => import("./pages/patient/PatientAppointmentsPage"));
const PatientPrescriptionsPage = lazy(() => import("./pages/patient/PatientPrescriptionsPage"));
const PatientLabResultsPage = lazy(() => import("./pages/patient/PatientLabResultsPage"));
const PatientMedicalHistoryPage = lazy(() => import("./pages/patient/PatientMedicalHistoryPage"));
const EnhancedPortalPage = lazy(() => import("./pages/patient/EnhancedPortalPage"));
const PatientMessagesPage = lazy(() => import("./pages/patient/PatientMessagesPage"));
const DoctorMessagesPage = lazy(() => import("./pages/messaging/DoctorMessagesPage"));
const TelemedicinePage = lazy(() => import("./pages/telemedicine/TelemedicinePage"));
const SuppliersPage = lazy(() => import("./pages/suppliers/SuppliersPage"));
const SchedulingPage = lazy(() => import("./pages/scheduling/SchedulingPage"));
const NotificationsPage = lazy(() => import("./pages/notifications/NotificationsPage"));
const DocumentsPage = lazy(() => import("./pages/documents/DocumentsPage"));
const NurseCareProtocolsPage = lazy(() => import("./pages/nurse/NurseCareProtocolsPage"));
const SmartSchedulerPage = lazy(() => import("./pages/receptionist/SmartSchedulerPage"));
const ClinicalPharmacyPage = lazy(() => import("./pages/pharmacy/ClinicalPharmacyPage"));
const LabAutomationPage = lazy(() => import("./pages/lab/LabAutomationPage"));
const WorkflowDashboard = lazy(() => import("./pages/integration/WorkflowDashboard"));
const WorkflowOptimizationPage = lazy(() => import("./pages/workflow/WorkflowOptimizationPage"));
const TestingDashboardPage = lazy(() => import("./pages/testing/TestingDashboardPage"));
const AIDemoPage = lazy(() => import("./pages/AIDemoPage"));
const DifferentialDiagnosisPage = lazy(() => import("./pages/DifferentialDiagnosisPage"));
const TreatmentRecommendationsPage = lazy(() => import("./pages/TreatmentRecommendationsPage"));
const TreatmentPlanOptimizationPage = lazy(() => import("./pages/TreatmentPlanOptimizationPage"));
const PredictiveAnalyticsPage = lazy(() => import("./pages/PredictiveAnalyticsPage"));
const LengthOfStayForecastingPage = lazy(() => import("./pages/LengthOfStayForecastingPage"));
const ResourceUtilizationOptimizationPage = lazy(() => import("./pages/ResourceUtilizationOptimizationPage"));
const VoiceClinicalNotesPage = lazy(() => import("./pages/VoiceClinicalNotesPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component - redirects to setup if account incomplete
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isProfileReady, profile, hospital, roles } = useAuth();

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

  if (!isAuthenticated) {
    return <Navigate to="/hospital/login" replace />;
  }

  // Wait for profile data to fully hydrate before evaluating setup status.
  // This prevents a race condition where isLoading=false but fetchUserData
  // hasn't resolved yet, causing a spurious redirect to account-setup.
  if (!isProfileReady) {
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

  // Check if setup is incomplete
  const needsSetup = !profile || !hospital || roles.length === 0;
  if (needsSetup) {
    return <Navigate to="/hospital/account-setup" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirect to dashboard if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<DashboardLoadingFallback />}>
      <Routes>
      {/* Redirect root to hospital landing */}
      <Route path="/" element={<Navigate to="/hospital" replace />} />
      <Route path="/login" element={<Navigate to="/hospital/login" replace />} />
      <Route path="/auth/login" element={<Navigate to="/hospital/login" replace />} />
      <Route path="/signup" element={<Navigate to="/hospital/signup" replace />} />
      <Route path="/register" element={<Navigate to="/hospital/signup" replace />} />
      <Route path="/forgot-password" element={<Navigate to="/hospital/forgot-password" replace />} />
      <Route path="/patient/login" element={<Navigate to="/patient-login" replace />} />
      <Route path="/patient/register" element={<Navigate to="/patient-register" replace />} />
      <Route path="/patient/forgot-password" element={<Navigate to="/hospital/forgot-password" replace />} />
      
      {/* Public Routes */}
      <Route
        path="/hospital"
        element={
          <PublicRoute>
            <LandingPage />
          </PublicRoute>
        }
      />
      <Route
        path="/hospital/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/hospital/signup"
        element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        }
      />
      <Route
        path="/hospital/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      <Route
        path="/hospital/reset-password"
        element={<ResetPasswordPage />}
      />
      <Route
        path="/hospital/join/:token"
        element={
          <PublicRoute>
            <JoinPage />
          </PublicRoute>
        }
      />
      <Route
        path="/quick-access"
        element={<QuickAccessPage />}
      />
      <Route
        path="/patient-register"
        element={
          <PublicRoute>
            <PatientRegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/patient-login"
        element={
          <PublicRoute>
            <PatientLoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/hospital/profile-setup"
        element={
          <ProtectedRoute>
            <ProfileSetupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hospital/role-setup"
        element={
          <ProtectedRoute>
            <AdminRoleSetupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hospital/account-setup"
        element={<AccountSetupPage />}
      />
      {/* Protected Routes */}

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/dashboard" element={<Navigate to="/dashboard" replace />} />
      <Route path="/doctor/dashboard" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard/nurse" element={<Navigate to="/dashboard" replace />} />
      <Route path="/patient/dashboard" element={<Navigate to="/patient/portal" replace />} />
      
      {/* Placeholder routes for navigation */}
      <Route
        path="/patients"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist']} requiredPermission="patients">
            <PatientsPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/patients/:id"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist']}>
            <PatientProfilePage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist']} requiredPermission="appointments">
            <AppointmentsPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/consultations"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse']} requiredPermission="consultations:read">
            <ConsultationsPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/consultations/mobile"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor']}>
            <MobileConsultationPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/consultations/:id"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse']}>
            <ConsultationWorkflowPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/pharmacy"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'pharmacist']} requiredPermission="pharmacy">
            <PharmacyPage />
          </RoleProtectedRoute>
        }
      />
      <Route path="/pharmacy/prescriptions" element={<Navigate to="/pharmacy" replace />} />
      <Route path="/clinical-pharmacy" element={<Navigate to="/pharmacy/clinical" replace />} />
      <Route
        path="/pharmacy/clinical"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'pharmacist']} requiredPermission="clinical-pharmacy">
            <ClinicalPharmacyPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/queue"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist']} requiredPermission="queue:read">
            <QueueManagementPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/laboratory"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'lab_technician']} requiredPermission="lab:read">
            <LaboratoryPage />
          </RoleProtectedRoute>
        }
      />
      <Route path="/lab/orders" element={<Navigate to="/laboratory" replace />} />
      <Route
        path="/laboratory/automation"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'lab_technician']}>
            <LabAutomationPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'receptionist']} requiredPermission="billing:read">
            <BillingPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'pharmacist']} requiredPermission="inventory:read">
            <InventoryPage />
          </RoleProtectedRoute>
        }
      />
      <Route path="/pharmacy/inventory" element={<Navigate to="/inventory" replace />} />
      <Route
        path="/reports"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor']} requiredPermission="reports">
            <ReportsPage />
          </RoleProtectedRoute>
        }
      />
      {/* Patient Portal Routes */}
      <Route
        path="/patient/appointments"
        element={
          <RoleProtectedRoute allowedRoles={['patient']} requiredPermission="appointments:read">
            <PatientAppointmentsPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/patient/prescriptions"
        element={
          <RoleProtectedRoute allowedRoles={['patient']} requiredPermission="prescriptions:read">
            <PatientPrescriptionsPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/patient/lab-results"
        element={
          <RoleProtectedRoute allowedRoles={['patient']} requiredPermission="lab:read">
            <PatientLabResultsPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/patient/medical-history"
        element={
          <RoleProtectedRoute allowedRoles={['patient']}>
            <PatientMedicalHistoryPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/patient/portal"
        element={
          <RoleProtectedRoute allowedRoles={['patient']} requiredPermission="portal">
            <EnhancedPortalPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/patient/messages"
        element={
          <RoleProtectedRoute allowedRoles={['patient']}>
            <PatientMessagesPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'pharmacist', 'lab_technician']}>
            <DoctorMessagesPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/telemedicine"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse']} requiredPermission="telemedicine:read">
            <TelemedicinePage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <RoleProtectedRoute allowedRoles={['admin']} requiredPermission="settings">
            <HospitalSettingsPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <UserProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/staff" element={<Navigate to="/settings/staff" replace />} />
      <Route path="/settings/staff-management" element={<Navigate to="/settings/staff" replace />} />
      <Route path="/admin/settings" element={<Navigate to="/settings" replace />} />
      <Route
        path="/settings/performance"
        element={
          <RoleProtectedRoute allowedRoles={['admin']} requiredPermission="staff-performance">
            <StaffPerformancePage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/settings/activity"
        element={
          <RoleProtectedRoute allowedRoles={['admin']} requiredPermission="activity-logs">
            <ActivityLogsPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/settings/monitoring"
        element={
          <RoleProtectedRoute allowedRoles={['admin']} requiredPermission="system-monitoring">
            <SystemMonitoringPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/ai-demo"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor']}>
            <AIDemoPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/differential-diagnosis"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor']}>
            <DifferentialDiagnosisPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/treatment-recommendations"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor']}>
            <TreatmentRecommendationsPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/treatment-plan-optimization"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor']}>
            <TreatmentPlanOptimizationPage />
          </RoleProtectedRoute>
        }
      />
      <Route path="/treatment-plan-optimizer" element={<Navigate to="/treatment-plan-optimization" replace />} />
      <Route
        path="/predictive-analytics"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor']}>
            <PredictiveAnalyticsPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/length-of-stay-forecasting"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor']}>
            <LengthOfStayForecastingPage />
          </RoleProtectedRoute>
        }
      />
      <Route path="/length-of-stay-forecast" element={<Navigate to="/length-of-stay-forecasting" replace />} />
      <Route path="/resource-utilization" element={<Navigate to="/resource-utilization-optimization" replace />} />
      <Route path="/analytics" element={<Navigate to="/reports" replace />} />
      <Route
        path="/resource-utilization-optimization"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor']}>
            <ResourceUtilizationOptimizationPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/voice-clinical-notes"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse']}>
            <VoiceClinicalNotesPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'pharmacist']}>
            <SuppliersPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/scheduling"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'receptionist']}>
            <SchedulingPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist']}>
            <DocumentsPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/receptionist/smart-scheduler"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'receptionist']}>
            <SmartSchedulerPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/nurse/protocols"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'nurse']}>
            <NurseCareProtocolsPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/integration/workflow"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician']} requiredPermission="workflow-dashboard">
            <WorkflowDashboard />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/workflow/optimization"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician']}>
            <WorkflowOptimizationPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/testing"
        element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <TestingDashboardPage />
          </RoleProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <AuthProvider>
          <TestingProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <RouteAwareErrorBoundary>
                  <AppContent />
                </RouteAwareErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </TestingProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
);
};

const RouteAwareErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
};

// AppContent component that uses hooks requiring AuthProvider
const AppContent = () => {
  // Monitor performance in production - now inside AuthProvider context
  usePerformanceMonitoring();
  
  return <AppRoutes />;
};

export default App;
