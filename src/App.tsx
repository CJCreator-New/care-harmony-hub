import { Suspense } from 'react';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { BrowserRouter, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TestingProvider } from '@/contexts/TestingContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { useAmendmentAlert } from '@/hooks/useAmendmentAlert';
import { RouteFallback } from '@/components/common/RouteFallback';
import { SkipNavigation } from '@/components/accessibility/SkipNavigation';
import { SessionTimeoutDialog } from '@/components/common/SessionTimeoutDialog';
import {
  fallbackRoute,
  publicRoutes,
  protectedRoutes,
  redirectRoutes,
  renderRoutes,
} from '@/routes/routeDefinitions';

function AppRoutes() {
  return (
    <Routes>
      {renderRoutes(redirectRoutes)}
      {renderRoutes(publicRoutes)}
      {renderRoutes(protectedRoutes)}
      {fallbackRoute}
    </Routes>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <AuthProvider>
          <TestingProvider>
            <TooltipProvider>
              {/* A11Y-12: one skip link for the whole app, before any chrome. Targets the page <main id="main-content">. */}
              <SkipNavigation targetId="main-content" />
              <Sonner position="top-right" />
              <SessionTimeoutDialog />
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

const AppContent = () => {
  usePerformanceMonitoring();
  useAmendmentAlert();

  return (
    <Suspense fallback={<RouteFallback />}>
      <AppRoutes />
    </Suspense>
  );
};

export default App;
