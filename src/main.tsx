import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/monitoring/sentry";
import { initWebVitals } from "./lib/performance/web-vitals";
import { ErrorBoundary } from "./lib/monitoring/ErrorBoundary";
import { sanitizeLogMessage } from "./utils/sanitize";

initSentry();
initWebVitals();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .catch(err => console.error('SW registration failed:', sanitizeLogMessage(err instanceof Error ? err.message : 'Unknown error')));
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
