import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export function ScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const spring = useSpring(scrollProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const backgroundColor = useTransform(
    spring,
    [0, 0.5, 1],
    [
      'hsl(var(--primary))',
      'hsl(var(--info))',
      'hsl(var(--success))',
    ]
  );

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = window.scrollY / scrollHeight;
      setScrollProgress(Math.min(progress, 1));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    spring.set(scrollProgress);
  }, [scrollProgress, spring]);

  return (
    <div className="fixed top-16 left-0 right-0 z-40 h-1 bg-border/50">
      <motion.div
        className="h-full origin-left"
        style={{
          scaleX: spring,
          backgroundColor,
        }}
      />
    </div>
  );
}
