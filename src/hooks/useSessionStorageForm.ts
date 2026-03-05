import { useState, useEffect, useCallback } from 'react';

/**
 * Persists form state to sessionStorage so that users don't lose their work
 * if they accidentally navigate away (e.g. during multi-step forms like
 * AccountSetupPage).  Data is scoped to the browser tab and cleared when
 * the tab is closed, which is appropriate for in-progress form data.
 *
 * @example
 * const [formData, setFormData, clearSession] = useSessionStorageForm(
 *   'account-setup',
 *   { name: '', email: '' }
 * );
 */
export function useSessionStorageForm<T extends object>(
  key: string,
  initialValues: T,
): [T, (updater: Partial<T> | ((prev: T) => T)) => void, () => void] {
  const storageKey = `form_session_${key}`;

  const [state, setState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      return stored ? { ...initialValues, ...(JSON.parse(stored) as Partial<T>) } : initialValues;
    } catch {
      return initialValues;
    }
  });

  // Sync to sessionStorage whenever state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // sessionStorage not available (private browsing quota etc.) — silently ignore
    }
  }, [storageKey, state]);

  const update = useCallback(
    (updater: Partial<T> | ((prev: T) => T)) => {
      setState((prev) =>
        typeof updater === 'function' ? updater(prev) : { ...prev, ...updater },
      );
    },
    [],
  );

  const clearSession = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch { /* ignore */ }
    setState(initialValues);
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return [state, update, clearSession];
}
