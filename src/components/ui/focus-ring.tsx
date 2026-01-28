import { cn } from "@/lib/utils"
import * as React from "react"

/**
 * Focus ring component for consistent focus indicators
 * 
 * @example
 * ```tsx
 * <FocusRing>
 *   <button>Click me</button>
 * </FocusRing>
 * ```
 */
interface FocusRingProps {
  children: React.ReactNode
  className?: string
  focusClassName?: string
}

function FocusRing({ children, className, focusClassName }: FocusRingProps) {
  return (
    <div
      className={cn(
        "relative rounded-md",
        "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Skip to content link for keyboard navigation
 * 
 * @example
 * ```tsx
 * <SkipToContent targetId="main-content" />
 * <main id="main-content">...</main>
 * ```
 */
function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4",
        "z-50 px-4 py-2 bg-primary text-primary-foreground rounded-md",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      )}
    >
      Skip to content
    </a>
  )
}

/**
 * Visually hidden component for screen readers
 */
function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  )
}

export { FocusRing, SkipToContent, VisuallyHidden }