import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

/**
 * Icon size variants following design system standards
 */
const iconSizes = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
  "2xl": "h-10 w-10",
} as const

type IconSize = keyof typeof iconSizes

/**
 * Icon color variants
 */
const iconColors = {
  default: "text-current",
  primary: "text-primary",
  secondary: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
  white: "text-white",
} as const

type IconColor = keyof typeof iconColors

interface IconProps {
  icon: LucideIcon
  size?: IconSize
  color?: IconColor
  className?: string
  ariaLabel?: string
}

/**
 * Standardized Icon component
 * 
 * @example
 * ```tsx
 * <Icon icon={User} size="md" color="primary" ariaLabel="User profile" />
 * ```
 */
function Icon({
  icon: IconComponent,
  size = "md",
  color = "default",
  className,
  ariaLabel,
}: IconProps) {
  return (
    <IconComponent
      className={cn(
        iconSizes[size],
        iconColors[color],
        className
      )}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
    />
  )
}

/**
 * Icon with background wrapper
 */
interface IconBoxProps extends IconProps {
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost"
  boxSize?: IconSize
}

function IconBox({
  icon,
  size = "md",
  boxSize = "lg",
  color = "default",
  variant = "default",
  className,
  ariaLabel,
}: IconBoxProps) {
  const variantStyles = {
    default: "bg-muted text-foreground",
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary text-secondary-foreground",
    outline: "border border-border bg-background",
    ghost: "bg-transparent",
  }

  const boxSizeStyles = {
    xs: "p-1",
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5",
    xl: "p-3",
    "2xl": "p-4",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-lg",
        variantStyles[variant],
        boxSizeStyles[boxSize],
        className
      )}
    >
      <Icon icon={icon} size={size} color={color} ariaLabel={ariaLabel} />
    </div>
  )
}

/**
 * Icon with text label
 */
interface IconTextProps extends IconProps {
  children: React.ReactNode
  gap?: "xs" | "sm" | "md"
  direction?: "horizontal" | "vertical"
}

function IconText({
  icon,
  size = "sm",
  color = "default",
  children,
  gap = "sm",
  direction = "horizontal",
  className,
  ariaLabel,
}: IconTextProps) {
  const gapStyles = {
    xs: direction === "horizontal" ? "gap-1" : "gap-0.5",
    sm: direction === "horizontal" ? "gap-2" : "gap-1",
    md: direction === "horizontal" ? "gap-3" : "gap-2",
  }

  const directionStyles = {
    horizontal: "flex-row items-center",
    vertical: "flex-col items-center text-center",
  }

  return (
    <div
      className={cn(
        "inline-flex",
        directionStyles[direction],
        gapStyles[gap],
        className
      )}
    >
      <Icon icon={icon} size={size} color={color} ariaLabel={ariaLabel} />
      <span className="text-sm">{children}</span>
    </div>
  )
}

export { Icon, IconBox, IconText, iconSizes, iconColors }
export type { IconSize, IconColor, IconProps, IconBoxProps, IconTextProps }