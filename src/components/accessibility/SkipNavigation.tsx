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
      className="absolute left-4 top-4 z-[100] -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg ring-2 ring-ring ring-offset-2 transition-transform focus:translate-y-0 focus:outline-none"
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
      className="absolute left-4 top-14 z-[100] -translate-y-20 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-lg ring-2 ring-ring ring-offset-2 transition-transform focus:translate-y-0 focus:outline-none"
      aria-label={label}
    >
      {label}
    </a>
  );
}
