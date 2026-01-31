interface SkipNavigationProps {
  /** Target element ID (without #) */
  targetId?: string;
  /** Custom label for screen readers */
  label?: string;
}

export function SkipNavigation({ 
  targetId = 'main-content',
  label = 'Skip to main content'
}: SkipNavigationProps) {
  return (
    <a 
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none transition-all"
      aria-label={label}
    >
      {label}
    </a>
  );
}

/** Skip link for navigating to specific sections */
export function SkipToSection({ 
  targetId, 
  label 
}: { 
  targetId: string; 
  label: string; 
}) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-14 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-secondary focus:text-secondary-foreground focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none transition-all"
      aria-label={label}
    >
      {label}
    </a>
  );
}
