import { cn } from "@/lib/utils"
import { motion, useReducedMotion } from "framer-motion"
import * as React from "react"

/**
 * Button with micro-interactions
 * Includes press feedback, hover lift, and ripple effect
 */
interface InteractiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive"
  size?: "sm" | "md" | "lg"
  isLoading?: boolean
  children: React.ReactNode
}

const InteractiveButton = React.forwardRef<HTMLButtonElement, InteractiveButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion()

    const baseStyles = "relative inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
    
    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    }

    const sizes = {
      sm: "h-9 px-3 text-sm rounded-md",
      md: "h-10 px-4 py-2 rounded-md",
      lg: "h-11 px-8 rounded-md",
    }

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        whileHover={shouldReduceMotion ? {} : { y: -2 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
        {...props}
      >
        {isLoading && (
          <motion.svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </motion.svg>
        )}
        {children}
      </motion.button>
    )
  }
)
InteractiveButton.displayName = "InteractiveButton"

/**
 * Card with hover lift effect
 */
interface HoverCardProps {
  children: React.ReactNode
  className?: string
  liftAmount?: number
  shadow?: boolean
}

function HoverCard({ children, className, liftAmount = 4, shadow = true }: HoverCardProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      className={cn(
        "rounded-lg border bg-card text-card-foreground",
        shadow && "shadow-sm",
        className
      )}
      whileHover={shouldReduceMotion ? {} : { y: -liftAmount }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Input with focus animation
 */
interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const AnimatedInput = React.forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion()
    const [isFocused, setIsFocused] = React.useState(false)

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}
        <motion.div
          className={cn(
            "relative rounded-md border bg-background",
            error ? "border-destructive" : "border-input",
            isFocused && !error && "border-primary"
          )}
          animate={shouldReduceMotion ? {} : {
            boxShadow: isFocused && !error
              ? "0 0 0 3px hsl(var(--primary) / 0.1)"
              : "0 0 0 0px transparent"
          }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
        >
          <input
            ref={ref}
            className={cn(
              "flex h-10 w-full rounded-md bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            {...props}
          />
        </motion.div>
        {error && (
          <motion.p
            initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}
        {helperText && !error && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    )
  }
)
AnimatedInput.displayName = "AnimatedInput"

/**
 * Badge with pulse animation for notifications
 */
interface PulseBadgeProps {
  children: React.ReactNode
  count?: number
  maxCount?: number
  showZero?: boolean
  className?: string
}

function PulseBadge({ children, count, maxCount = 99, showZero = false, className }: PulseBadgeProps) {
  const shouldReduceMotion = useReducedMotion()
  const displayCount = count !== undefined && count > maxCount ? `${maxCount}+` : count

  const showBadge = count !== undefined && (count > 0 || showZero)

  return (
    <div className={cn("relative inline-flex", className)}>
      {children}
      {showBadge && (
        <motion.span
          className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-medium text-destructive-foreground"
          initial={shouldReduceMotion ? {} : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          {!shouldReduceMotion && count !== undefined && count > 0 && (
            <motion.span
              className="absolute inset-0 rounded-full bg-destructive"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <span className="relative">{displayCount}</span>
        </motion.span>
      )}
    </div>
  )
}

/**
 * Toast/notification with slide animation
 */
interface ToastProps {
  title: string
  description?: string
  variant?: "default" | "success" | "error" | "warning" | "info"
  onClose?: () => void
  className?: string
}

function Toast({ title, description, variant = "default", onClose, className }: ToastProps) {
  const shouldReduceMotion = useReducedMotion()

  const variants = {
    default: "bg-background border-border",
    success: "bg-success/10 border-success/20 text-success-foreground",
    error: "bg-destructive/10 border-destructive/20 text-destructive-foreground",
    warning: "bg-warning/10 border-warning/20 text-warning-foreground",
    info: "bg-info/10 border-info/20 text-info-foreground",
  }

  return (
    <motion.div
      className={cn(
        "pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-lg border p-4 shadow-lg",
        variants[variant],
        className
      )}
      initial={shouldReduceMotion ? {} : { opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={shouldReduceMotion ? {} : { opacity: 0, x: 100 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h4 className="font-semibold">{title}</h4>
          {description && (
            <p className="mt-1 text-sm opacity-90">{description}</p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
            aria-label="Close notification"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {!shouldReduceMotion && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-current opacity-30"
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: 5, ease: "linear" }}
        />
      )}
    </motion.div>
  )
}

/**
 * Switch with smooth toggle animation
 */
interface AnimatedSwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

function AnimatedSwitch({ checked, onCheckedChange, disabled, className }: AnimatedSwitchProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        className
      )}
    >
      <motion.span
        className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: shouldReduceMotion ? "tween" : "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  )
}

/**
 * Tooltip with fade animation
 */
interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  className?: string
}

function Tooltip({ children, content, side = "top", className }: TooltipProps) {
  const shouldReduceMotion = useReducedMotion()
  const [isVisible, setIsVisible] = React.useState(false)

  const sideStyles = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <motion.div
          className={cn(
            "absolute z-50 max-w-xs whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground",
            sideStyles[side],
            className
          )}
          initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
        >
          {content}
        </motion.div>
      )}
    </div>
  )
}

/**
 * Staggered list animation wrapper
 */
interface StaggeredListProps {
  children: React.ReactNode[]
  className?: string
  staggerDelay?: number
}

function StaggeredList({ children, className, staggerDelay = 0.05 }: StaggeredListProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.3,
            delay: shouldReduceMotion ? 0 : index * staggerDelay,
            ease: "easeOut"
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}

/**
 * Page transition wrapper
 */
interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

function PageTransition({ children, className }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
    >
      {children}
    </motion.div>
  )
}

export {
  InteractiveButton,
  HoverCard,
  AnimatedInput,
  PulseBadge,
  Toast,
  AnimatedSwitch,
  Tooltip,
  StaggeredList,
  PageTransition,
}
export type {
  InteractiveButtonProps,
  HoverCardProps,
  AnimatedInputProps,
  PulseBadgeProps,
  ToastProps,
  AnimatedSwitchProps,
  TooltipProps,
  StaggeredListProps,
  PageTransitionProps,
}