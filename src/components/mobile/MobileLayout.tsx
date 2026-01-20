import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
}

export const MobileLayout = ({ children, className }: MobileLayoutProps) => {
  return (
    <div className={cn(
      "min-h-screen w-full px-4 py-2 sm:px-6 md:px-8",
      className
    )}>
      {children}
    </div>
  );
};
