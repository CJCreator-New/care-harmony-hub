import { useEffect, useState } from 'react';

/**
 * Hook to detect user's preference for reduced motion
 * 
 * @returns boolean - true if user prefers reduced motion
 * 
 * @example
 * ```typescript
 * const prefersReducedMotion = useReducedMotion();
 * 
 * <motion.div
 *   animate={prefersReducedMotion ? {} : { scale: 1.1 }}
 * />
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to get animation transition settings based on reduced motion preference
 * 
 * @param normalTransition - The normal transition settings
 * @returns Transition settings respecting reduced motion preference
 * 
 * @example
 * ```typescript
 * const transition = useAccessibleTransition({ duration: 0.3, ease: "easeInOut" });
 * 
 * <motion.div transition={transition} />
 * ```
 */
export function useAccessibleTransition<T extends object>(
  normalTransition: T
): T | { duration: 0 } {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return { duration: 0 } as T | { duration: 0 };
  }
  
  return normalTransition;
}

/**
 * Animation variants that respect reduced motion preference
 */
export const accessibleVariants = {
  fadeIn: (prefersReducedMotion: boolean) => ({
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }
    },
  }),
  
  slideUp: (prefersReducedMotion: boolean) => ({
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }
    },
  }),
  
  scale: (prefersReducedMotion: boolean) => ({
    hidden: { opacity: 0, scale: prefersReducedMotion ? 1 : 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }
    },
  }),
};

export default useReducedMotion;