import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function UrgencyBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 59,
  });

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

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0, height: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-primary via-primary/90 to-info"
        >
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 justify-center">
                <Zap className="w-4 h-4 text-primary-foreground animate-pulse" />
                
                <span className="text-sm font-medium text-primary-foreground">
                  Limited Time: <span className="font-bold">50% off</span> first 3 months
                </span>
                
                <div className="flex items-center gap-1 text-primary-foreground">
                  <Clock className="w-4 h-4" />
                  <div className="flex items-center gap-1 font-mono font-bold text-sm">
                    <motion.span
                      key={`hours-${timeLeft.hours}`}
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="bg-primary-foreground/20 px-1.5 py-0.5 rounded"
                    >
                      {formatNumber(timeLeft.hours)}
                    </motion.span>
                    <span>:</span>
                    <motion.span
                      key={`minutes-${timeLeft.minutes}`}
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="bg-primary-foreground/20 px-1.5 py-0.5 rounded"
                    >
                      {formatNumber(timeLeft.minutes)}
                    </motion.span>
                    <span>:</span>
                    <motion.span
                      key={`seconds-${timeLeft.seconds}`}
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="bg-primary-foreground/20 px-1.5 py-0.5 rounded"
                    >
                      {formatNumber(timeLeft.seconds)}
                    </motion.span>
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
