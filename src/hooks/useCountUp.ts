import { useState, useEffect } from 'react';

/**
 * Animates a numeric value from 0 to `target` over `duration` ms.
 * Uses an ease-out cubic curve so it races in and settles smoothly.
 * Respects prefers-reduced-motion by returning the target immediately.
 *
 * @param target   The final numeric value to count up to.
 * @param duration Animation duration in milliseconds (default: 1100).
 * @param delay    Delay before animation starts in milliseconds (default: 150).
 */
export function useCountUp(
  target: number,
  duration: number = 1100,
  delay: number = 150,
): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    // Respect user's reduced-motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setValue(target);
      return;
    }

    let rAF: number;
    const startTimer = setTimeout(() => {
      const start = performance.now();

      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic: fast start, smooth finish
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));

        if (progress < 1) {
          rAF = requestAnimationFrame(animate);
        }
      };

      rAF = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(startTimer);
      cancelAnimationFrame(rAF);
    };
  }, [target, duration, delay]);

  return value;
}
