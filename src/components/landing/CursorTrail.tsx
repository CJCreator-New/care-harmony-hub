import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrailDot {
  id: number;
  x: number;
  y: number;
}

export function CursorTrail() {
  const [trail, setTrail] = useState<TrailDot[]>([]);
  const [isDesktop, setIsDesktop] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if desktop
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isDesktop || prefersReducedMotion) return;

    let idCounter = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const newDot: TrailDot = {
        id: idCounter++,
        x: e.clientX,
        y: e.clientY,
      };

      setTrail((prev) => [...prev.slice(-5), newDot]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isDesktop, prefersReducedMotion]);

  // Clean up old dots
  useEffect(() => {
    if (trail.length === 0) return;

    const timeout = setTimeout(() => {
      setTrail((prev) => prev.slice(1));
    }, 100);

    return () => clearTimeout(timeout);
  }, [trail]);

  if (!isDesktop || prefersReducedMotion) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      <AnimatePresence>
        {trail.map((dot, index) => (
          <motion.div
            key={dot.id}
            initial={{ opacity: 0.3, scale: 1 }}
            animate={{ opacity: 0, scale: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute w-2 h-2 rounded-full bg-primary/30"
            style={{
              left: dot.x - 4,
              top: dot.y - 4,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
