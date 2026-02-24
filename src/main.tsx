import { createRoot } from "react-dom/client";
import { HelmetProvider } from 'react-helmet-async';
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/monitoring/sentry";
import { initWebVitals } from "./lib/performance/web-vitals";
import { sanitizeLogMessage } from "./utils/sanitize";

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
  // Suppress Vite HMR / WebSocket churn in development — these are not app errors
  if (isDevNoise(event.reason)) {
    event.preventDefault();
    return;
  }

  console.error('Unhandled Promise Rejection:', event.reason);

  // Send to Sentry if available
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    try {
      (window as any).Sentry.captureException(event.reason);
    } catch (e) {
      // Ignore Sentry errors
    }
  }

  // Prevent default to avoid console error spam
  event.preventDefault();
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

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .catch(err => console.error('SW registration failed:', sanitizeLogMessage(err instanceof Error ? err.message : 'Unknown error')));
  });
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
