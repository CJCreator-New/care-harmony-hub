import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';

const notifications = [
  { name: 'Dr. Sharma', hospital: 'Apollo Hospitals', city: 'Delhi NCR', action: 'booked a demo' },
  { name: 'Priya Menon', hospital: 'Max Healthcare', city: 'Bangalore', action: 'started a trial' },
  { name: 'Dr. Verma', hospital: 'Fortis Hospitals', city: 'Mumbai', action: 'booked a demo' },
  { name: 'Kavya Iyer', hospital: 'Manipal Hospitals', city: 'Hyderabad', action: 'started a trial' },
  { name: 'Dr. Patel', hospital: 'Medanta', city: 'Gurugram', action: 'booked a demo' },
  { name: 'Rahul Singh', hospital: 'AIIMS', city: 'New Delhi', action: 'requested a quote' },
];

export function SocialProofPopup() {
  const [currentNotification, setCurrentNotification] = useState<typeof notifications[0] | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  // Use refs to track timeouts for proper cleanup
  const initialDelayRef = useRef<NodeJS.Timeout | null>(null);
  const nextDelayRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      if (initialDelayRef.current) clearTimeout(initialDelayRef.current);
      if (nextDelayRef.current) clearTimeout(nextDelayRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const showRandomNotification = useCallback(() => {
    // Clear any existing hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    const randomIndex = Math.floor(Math.random() * notifications.length);
    setCurrentNotification(notifications[randomIndex]);
    setIsVisible(true);

    // Auto-hide after 4 seconds
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 4000);
  }, []);

  useEffect(() => {
    // Initial delay before first notification
    initialDelayRef.current = setTimeout(() => {
      showRandomNotification();
    }, 5000);

    return () => {
      if (initialDelayRef.current) clearTimeout(initialDelayRef.current);
    };
  }, [showRandomNotification]);

  useEffect(() => {
    if (!isVisible) {
      // Schedule next notification after random interval (8-15 seconds)
      const nextDelay = 8000 + Math.random() * 7000;
      nextDelayRef.current = setTimeout(() => {
        showRandomNotification();
      }, nextDelay);

      return () => {
        if (nextDelayRef.current) clearTimeout(nextDelayRef.current);
      };
    }
  }, [isVisible, showRandomNotification]);

  const handleDismiss = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    setIsVisible(false);
  };

  const getTimeAgo = () => {
    const times = ['just now', '2 min ago', '5 min ago', '8 min ago'];
    return times[Math.floor(Math.random() * times.length)];
  };

  // Don't render if user prefers reduced motion
  if (prefersReducedMotion) return null;

  return (
    <AnimatePresence>
      {isVisible && currentNotification && (
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-24 left-6 z-50 max-w-xs"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="bg-card border border-border rounded-lg shadow-lg p-4 flex items-start gap-3">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 0.5,
                repeat: 2,
              }}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-success/10 shrink-0"
              aria-hidden="true"
            >
              <CheckCircle2 className="w-5 h-5 text-success" />
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {currentNotification.name} from {currentNotification.hospital}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentNotification.action}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {getTimeAgo()} • {currentNotification.city}
              </p>
            </div>
            
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-muted rounded-full transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
