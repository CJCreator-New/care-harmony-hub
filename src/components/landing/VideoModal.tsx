import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VideoModal({ isOpen, onClose }: VideoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border-border">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-lg font-semibold">Product Demo</DialogTitle>
        </DialogHeader>
        
        <div className="p-4">
          {/* Video Placeholder - Replace with actual video embed */}
          <div className="relative aspect-video rounded-lg bg-muted overflow-hidden">
            {/* Placeholder content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-info/10">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4"
              >
                <Play className="w-8 h-8 text-primary ml-1" />
              </motion.div>
              <p className="text-lg font-semibold mb-2">Demo Video Coming Soon</p>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                See how CareSync streamlines hospital operations from patient registration 
                to discharge. Schedule a live demo for a personalized walkthrough.
              </p>
            </div>
            
            {/* Uncomment and replace VIDEO_ID for actual YouTube embed:
            <iframe
              className="absolute inset-0 w-full h-full"
              src="https://www.youtube.com/embed/VIDEO_ID?autoplay=1"
              title="Product Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            */}
          </div>
          
          {/* CTA below video */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <Button variant="hero" asChild>
              <a href="/hospital/signup">
                Schedule Live Demo
              </a>
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easy video modal management
export function useVideoModal() {
  const [isOpen, setIsOpen] = useState(false);
  
  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);
  
  return { isOpen, openModal, closeModal };
}
