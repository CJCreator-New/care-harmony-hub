import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';

export function FloatingCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

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
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2"
        >
          <motion.div
            animate={{
              boxShadow: [
                '0 0 0 0 hsl(var(--primary) / 0.4)',
                '0 0 0 10px hsl(var(--primary) / 0)',
                '0 0 0 0 hsl(var(--primary) / 0)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
            }}
            className="rounded-full"
          >
            <Button
              variant="hero"
              size="lg"
              className="shadow-lg hover:scale-105 transition-transform"
              asChild
            >
              <Link to="/hospital/signup">
                <Calendar className="w-4 h-4 mr-2" />
                Book Demo
              </Link>
            </Button>
          </motion.div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-md"
            onClick={() => setIsDismissed(true)}
          >
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
