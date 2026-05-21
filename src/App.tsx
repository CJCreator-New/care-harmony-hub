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
import { bootstrap } from "@/bootstrap";
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
      ? (import.meta.env.MODE as 'development' | 'staging' | 'production')
      : 'development';
    const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';

    // Bootstrap application in strict initialization order
    const { getLogger, shutdown } = bootstrap({
      telemetry: {
        serviceName: 'care-harmony-hub',
        applicationVersion: appVersion,
        otlpEndpoint: otelEndpoint,
        environment: appEnv,
      },
      errorTracking: {
        dsn: import.meta.env.VITE_GLITCHTIP_DSN || import.meta.env.VITE_SENTRY_DSN,
        environment: appEnv,
        mode: import.meta.env.MODE,
      },
      logger: {
        version: appVersion,
        environment: appEnv,
      },
    });

    const logger = getLogger();
    logger.info('CareSync HMS initialized', {
      version: appVersion,
      environment: appEnv,
      otelEndpoint,
    });

    const handleBeforeUnload = () => {
      shutdown().catch((err) => console.error('[Bootstrap Shutdown]', err));
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
    // Keep Suspense non-blocking at the root to avoid replacing the entire
    // app shell during route lazy-loads which caused a full-screen white
    // flash. Individual pages/components should show their own spinners.
    <Suspense fallback={<></>}>
      <AppRoutes />
    </Suspense>
  );
};

export default App;

