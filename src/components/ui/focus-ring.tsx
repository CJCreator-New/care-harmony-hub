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
 * Visually hidden component for screen readers
 */
// Note: skip-to-content functionality lives in @/components/accessibility/SkipNavigation
function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  )
}

export { FocusRing, VisuallyHidden }