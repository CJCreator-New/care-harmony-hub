import { useEffect, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TestingProvider } from "@/contexts/TestingContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { usePerformanceMonitoring } from "@/hooks/usePerformanceMonitoring";
import { useAmendmentAlert } from "@/hooks/useAmendmentAlert";
import { initializeSentry } from "@/utils/sentry-integration";
import { initializeMetrics } from "@/services/metrics";
import { createLogger } from "@/utils/logger";
import { initializeTelemetry, shutdownTelemetry } from "@/utils/telemetry";
import { registerFetchInterceptor, getCorrelationId } from "@/utils/correlationId";
import { initErrorTracking } from "@/utils/errorTracking";
import {
  fallbackRoute,
  publicRoutes,
  protectedRoutes,
  redirectRoutes,
  renderRoutes,
} from "@/routes/routeDefinitions";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
  useEffect(() => {
    const otelEndpoint = import.meta.env.VITE_OTEL_ENDPOINT || 'http://localhost:4318';
    const appEnv = (import.meta.env.MODE === 'production' || import.meta.env.MODE === 'staging')
      ? import.meta.env.MODE
      : 'development';

    initializeTelemetry({
      serviceName: 'care-harmony-hub',
      applicationVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
      otlpEndpoint: otelEndpoint,
      environment: appEnv,
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    });

    initErrorTracking({
      dsn: import.meta.env.VITE_GLITCHTIP_DSN || import.meta.env.VITE_SENTRY_DSN,
      environment: appEnv,
    });

    registerFetchInterceptor();
    initializeSentry(import.meta.env.VITE_SENTRY_DSN, import.meta.env.MODE);
    initializeMetrics();

    const logger = createLogger('app-root', {
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.MODE,
    });

    logger.info('CareSync HMS initialized', {
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.MODE,
      observability: 'enabled (Phase 3A + 3B)',
      correlationId: getCorrelationId(),
      otelEndpoint,
    });

    const handleBeforeUnload = () => {
            shutdownTelemetry().catch((err) => console.error('[Telemetry Shutdown]', err));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <AuthProvider>
          <TestingProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner position="top-right" />
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
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <AppRoutes />
    </Suspense>
  );
};

export default App;

