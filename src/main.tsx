import { createRoot } from "react-dom/client";
import { Component, type ReactNode, type ErrorInfo } from "react";
import { HelmetProvider } from 'react-helmet-async';
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/monitoring/sentry";
import { initWebVitals } from "./lib/performance/web-vitals";


// ─── Root-level error boundary ────────────────────────────────────────────────
// Catches synchronous render errors in ANY provider (AuthProvider, ThemeProvider,
// TestingProvider, etc.) that sit outside the in-app ErrorBoundary.
// Without this, provider crashes are swallowed by React 18 and produce a
// completely blank white page with zero console output.
class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Always log – even when the in-app Sentry handler is not yet mounted.
    console.error('[RootErrorBoundary] Unrecoverable render error:', error.message);
    if (import.meta.env.DEV) {
      console.error('Component stack:', info.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif', padding: '2rem', background: '#fff',
        }}>
          <h1 style={{ color: '#dc2626', fontSize: '1.5rem', marginBottom: '1rem' }}>
            Application failed to start
          </h1>
          <pre style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px',
            padding: '1rem', maxWidth: '800px', whiteSpace: 'pre-wrap', color: '#991b1b',
            fontSize: '0.875rem',
          }}>
            {this.state.error.message}
          </pre>
          <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
            Open the browser DevTools (F12) → Console for the full stack trace.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem', padding: '0.5rem 1.5rem', background: '#2563eb',
              color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

initSentry();
initWebVitals();

// Known dev-only noise patterns that should never reach Sentry or the console
const DEV_NOISE_PATTERNS = [
  /WebSocket closed without opened/i,
  /websocket/i,
  /\[vite\]/i,
];

const isDevNoise = (reason: unknown): boolean => {
  if (!import.meta.env.DEV) return false;
  const msg = reason instanceof Error ? reason.message : String(reason ?? '');
  return DEV_NOISE_PATTERNS.some(p => p.test(msg));
};

// Global unhandled rejection handler
window.addEventListener('unhandledrejection', (event) => {
  // Suppress ONLY Vite HMR / WebSocket churn in development — these are not app errors
  if (isDevNoise(event.reason)) {
    event.preventDefault();
    return;
  }

  // For real errors: always log so the developer can see them
  console.error('Unhandled Promise Rejection:', event.reason);

  // Send to Sentry if available
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    try {
      (window as any).Sentry.captureException(event.reason);
    } catch (e) {
      // Ignore Sentry errors
    }
  }

  // DO NOT call event.preventDefault() here — that silences real errors from
  // the browser console and makes blank-page debugging impossible.
});

// Global error handler for runtime errors
window.addEventListener('error', (event) => {
  console.error('Global Error:', event.error);
  
  // Send to Sentry if available
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    try {
      (window as any).Sentry.captureException(event.error);
    } catch (e) {
      // Ignore Sentry errors
    }
  }
});

// Service-worker cleanup
// In DEV: unregister all SWs so a stale production Workbox SW (installed from
//         a previous `npm run preview` on the same port) can't intercept Vite
//         HMR requests and serve cached old assets → blank page.
// In PROD: also remove the legacy /service-worker.js if still installed.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        const swUrl = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? '';
        if (import.meta.env.DEV) {
          // Remove ALL service workers in dev — they only cause trouble.
          reg.unregister().catch(() => undefined);
        } else if (swUrl.includes('/service-worker.js')) {
          // In prod, only remove the old hand-rolled SW; VitePWA Workbox /sw.js stays.
          reg.unregister().catch(() => undefined);
        }
      }
    }).catch(() => undefined);
  });
}

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </RootErrorBoundary>
);

