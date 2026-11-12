import { QueryClient } from '@tanstack/react-query';

/**
 * The application's single React Query client.
 *
 * It lives in its own module (rather than inside App.tsx) so that non-React
 * code such as `purgeClientState()` can clear the cache on logout without
 * prop-drilling or reaching into React context (SECF-05).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
