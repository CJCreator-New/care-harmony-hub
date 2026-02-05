import { createRoot } from "react-dom/client";
import { HelmetProvider } from 'react-helmet-async';
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/monitoring/sentry";
import { initWebVitals } from "./lib/performance/web-vitals";
import { sanitizeLogMessage } from "./utils/sanitize";

initSentry();
initWebVitals();

// Global unhandled rejection handler
window.addEventListener('unhandledrejection', (event) => {
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
