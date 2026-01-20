import { useEffect, useState } from 'react';

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  clearAfter?: number;
}

export function LiveRegion({ message, politeness = 'polite', clearAfter = 3000 }: LiveRegionProps) {
  const [currentMessage, setCurrentMessage] = useState('');

  useEffect(() => {
    if (message) {
      setCurrentMessage(message);
      if (clearAfter) {
        const timer = setTimeout(() => setCurrentMessage(''), clearAfter);
        return () => clearTimeout(timer);
      }
    }
  }, [message, clearAfter]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  );
}
