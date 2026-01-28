import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function UrgencyBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 59,
  });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        }
        
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  const TimeUnit = ({ value, label }: { value: number; label: string }) => {
    const formattedValue = formatNumber(value);
    
    if (prefersReducedMotion) {
      return (
        <span 
          className="bg-primary-foreground/20 px-1.5 py-0.5 rounded"
          aria-label={`${formattedValue} ${label}`}
        >
          {formattedValue}
        </span>
      );
    }
    
    return (
      <motion.span
        key={`${label}-${value}`}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-primary-foreground/20 px-1.5 py-0.5 rounded"
        aria-label={`${formattedValue} ${label}`}
      >
        {formattedValue}
      </motion.span>
    );
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: prefersReducedMotion ? 0 : -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: prefersReducedMotion ? 0 : -100, opacity: 0, height: 0 }}
          transition={{ 
            type: prefersReducedMotion ? 'tween' : 'spring', 
            stiffness: prefersReducedMotion ? undefined : 300, 
            damping: prefersReducedMotion ? undefined : 30,
            duration: prefersReducedMotion ? 0.2 : undefined
          }}
          className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-primary via-primary/90 to-info"
        >
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 justify-center">
                <Zap 
                  className={`w-4 h-4 text-primary-foreground ${prefersReducedMotion ? '' : 'animate-pulse'}`}
                  aria-hidden="true"
                />
                
                <span className="text-sm font-medium text-primary-foreground">
                  Limited Time: <span className="font-bold">50% off</span> first 3 months
                </span>
                
                <div className="flex items-center gap-1 text-primary-foreground">
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  <div 
                    className="flex items-center gap-1 font-mono font-bold text-sm"
                    aria-label={`Time remaining: ${timeLeft.hours} hours, ${timeLeft.minutes} minutes, ${timeLeft.seconds} seconds`}
                  >
                    <TimeUnit value={timeLeft.hours} label="hours" />
                    <span aria-hidden="true">:</span>
                    <TimeUnit value={timeLeft.minutes} label="minutes" />
                    <span aria-hidden="true">:</span>
                    <TimeUnit value={timeLeft.seconds} label="seconds" />
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="secondary"
                  className="hidden sm:inline-flex"
                  asChild
                >
                  <Link to="/hospital/signup">Claim Offer</Link>
                </Button>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setIsVisible(false)}
                aria-label="Dismiss promotional banner"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
