type RateLimitErrorLike = {
  status?: number;
  code?: string | number;
  message?: string;
};

type CircuitState = {
  failureCount: number;
  openUntil: number | null;
};

const circuitStateByKey = new Map<string, CircuitState>();

const DEFAULT_OPTIONS = {
  maxRetries: 4,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  circuitBreakerThreshold: 3,
  circuitBreakerTimeoutMs: 60_000,
};

export type RateLimitBackoffOptions = Partial<typeof DEFAULT_OPTIONS> & {
  key: string;
  onRetry?: (attempt: number, delayMs: number) => void;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const isRateLimitError = (error: unknown): boolean => {
  const err = error as RateLimitErrorLike;
  const status = err?.status ?? (typeof err?.code === "string" ? Number(err.code) : err?.code);
  if (status === 429) return true;
  if (typeof err?.message === "string" && err.message.toLowerCase().includes("rate limit")) {
    return true;
  }
  return false;
};

const getCircuitState = (key: string): CircuitState => {
  if (!circuitStateByKey.has(key)) {
    circuitStateByKey.set(key, { failureCount: 0, openUntil: null });
  }
  return circuitStateByKey.get(key)!;
};

const openCircuit = (state: CircuitState, timeoutMs: number) => {
  state.openUntil = Date.now() + timeoutMs;
};

const resetCircuit = (state: CircuitState) => {
  state.failureCount = 0;
  state.openUntil = null;
};

export const isCircuitOpen = (key: string): boolean => {
  const state = getCircuitState(key);
  if (!state.openUntil) return false;
  if (Date.now() >= state.openUntil) {
    resetCircuit(state);
    return false;
  }
  return true;
};

export async function executeWithRateLimitBackoff<T>(
  fn: () => Promise<T>,
  options: RateLimitBackoffOptions,
): Promise<T> {
  const {
    key,
    maxRetries,
    baseDelayMs,
    maxDelayMs,
    circuitBreakerThreshold,
    circuitBreakerTimeoutMs,
    onRetry,
  } = { ...DEFAULT_OPTIONS, ...options };

  const state = getCircuitState(key);
  if (isCircuitOpen(key)) {
    throw new Error("Rate limit circuit is open. Please wait and try again.");
  }

  let attempt = 0;

  while (true) {
    try {
      const result = await fn();
      resetCircuit(state);
      return result;
    } catch (error) {
      if (!isRateLimitError(error)) {
        throw error;
      }

      state.failureCount += 1;
      if (state.failureCount >= circuitBreakerThreshold) {
        openCircuit(state, circuitBreakerTimeoutMs);
      }

      if (attempt >= maxRetries) {
        throw error;
      }

      const delayMs = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      attempt += 1;
      onRetry?.(attempt, delayMs);
      await sleep(delayMs);
    }
  }
}
