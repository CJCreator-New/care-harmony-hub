/**
 * Suspense fallback shown while a lazily loaded route is fetched.
 * Exposed as a status region so screen readers announce the wait.
 */
export function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className="flex items-center justify-center min-h-screen"
    >
      Loading...
    </div>
  );
}
