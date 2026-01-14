import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Hook to dynamically import recharts
export function useRecharts() {
  const [components, setComponents] = useState<typeof import('recharts') | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('recharts')
      .then((module) => {
        setComponents(module);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load recharts:', error);
        setLoading(false);
      });
  }, []);

  return { components, loading };
}

// Chart loading skeleton
export function ChartSkeleton() {
  return (
    <div className="w-full h-[400px] flex items-center justify-center">
      <Skeleton className="w-full h-full" />
    </div>
  );
}