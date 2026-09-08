import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function FloatingCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const footer = document.querySelector('footer');
      const footerTop = footer?.getBoundingClientRect().top || Infinity;
      
      // Show after scrolling 300px, hide when footer is visible
      if (scrollY > 300 && footerTop > window.innerHeight && !isDismissed) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: prefersReducedMotion ? 20 : 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: prefersReducedMotion ? 20 : 100, opacity: 0 }}
          transition={{ 
            type: prefersReducedMotion ? 'tween' : 'spring', 
            stiffness: prefersReducedMotion ? undefined : 300, 
            damping: prefersReducedMotion ? undefined : 30,
            duration: prefersReducedMotion ? 0.2 : undefined
          }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2"
        >
          <Button
            variant="hero"
            size="lg"
            className="shadow-lg transition-transform hover:scale-105"
            asChild
          >
            <Link to="/hospital/signup">
              <Calendar className="w-4 h-4 mr-2" />
              Book a Demo
            </Link>
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-md"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss booking button"
          >
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
