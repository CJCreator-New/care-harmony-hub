import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";

// Pages
import LandingPage from "./pages/hospital/LandingPage";
import LoginPage from "./pages/hospital/LoginPage";
import SignupPage from "./pages/hospital/SignupPage";
import ForgotPasswordPage from "./pages/hospital/ForgotPasswordPage";
import ResetPasswordPage from "./pages/hospital/ResetPasswordPage";
import JoinPage from "./pages/hospital/JoinPage";
import Dashboard from "./pages/Dashboard";
import PatientsPage from "./pages/patients/PatientsPage";
import StaffManagementPage from "./pages/settings/StaffManagementPage";
import ConsultationsPage from "./pages/consultations/ConsultationsPage";
import ConsultationWorkflowPage from "./pages/consultations/ConsultationWorkflowPage";
import AppointmentsPage from "./pages/appointments/AppointmentsPage";
import LaboratoryPage from "./pages/laboratory/LaboratoryPage";
import PharmacyPage from "./pages/pharmacy/PharmacyPage";
import QueueManagementPage from "./pages/queue/QueueManagementPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/hospital/login" replace />;
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
    <Routes>
      {/* Redirect root to hospital landing */}
      <Route path="/" element={<Navigate to="/hospital" replace />} />
      
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
      
      {/* Placeholder routes for navigation */}
      <Route
        path="/patients"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist']}>
            <PatientsPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist']}>
            <AppointmentsPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/consultations"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse']}>
            <ConsultationsPage />
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
          <RoleProtectedRoute allowedRoles={['admin', 'pharmacist']}>
            <PharmacyPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/queue"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'receptionist']}>
            <QueueManagementPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/laboratory"
        element={
          <RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'lab_technician']}>
            <LaboratoryPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/telemedicine"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <StaffManagementPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/settings/staff"
        element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <StaffManagementPage />
          </RoleProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
