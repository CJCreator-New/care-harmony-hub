import { useState, useEffect } from 'react';

/**
 * Hook that debounces a value by delaying updates until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Update debounced value after delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes (also on delay change or unmount)
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that provides both the current value and debounced value
 * Useful when you need immediate access to current value but debounced for expensive operations
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns Object with current and debounced values
 */
export function useDebounceState<T>(value: T, delay = 300): { current: T; debounced: T } {
  const [current, setCurrent] = useState<T>(value);
  const debounced = useDebouncedValue(current, delay);

  useEffect(() => {
    setCurrent(value);
  }, [value]);

  return { current, debounced };
}