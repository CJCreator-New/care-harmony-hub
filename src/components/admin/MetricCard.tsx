import { cn } from "@/lib/utils"
import { motion, useReducedMotion } from "framer-motion"
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { HoverCard } from "@/components/ui/micro-interactions"

interface MetricCardProps {
  title: string
  value: number | string
  trend: "up" | "down" | "neutral"
  trendValue: string
  icon: LucideIcon
  className?: string
}

export function MetricCard({
  title,
  value,
  trend,
  trendValue,
  icon: Icon,
  className,
}: MetricCardProps) {
  const shouldReduceMotion = useReducedMotion()

  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-gray-500",
  }

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus

  return (
    <HoverCard liftAmount={4} className={cn("h-full", className)}>
      <div
        className="p-5 h-full flex flex-col"
        style={{ padding: "var(--space-5)" }}
      >
        <div
          className="flex items-start justify-between"
          style={{ marginBottom: "var(--space-4)" }}
        >
          <div
            className="p-2 rounded-lg bg-admin/10"
            style={{ padding: "var(--space-2)" }}
          >
            <Icon className="w-5 h-5 text-admin" />
          </div>
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-medium",
              trendColors[trend]
            )}
          >
            <TrendIcon className="w-4 h-4" />
            {trendValue}
          </div>
        </div>

        <div className="mt-auto">
          <p className="text-sm text-muted-foreground">{title}</p>
          <motion.p
            className="text-3xl font-bold mt-1"
            initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.3, delay: 0.1 }}
          >
            {value}
          </motion.p>
        </div>
      </div>
    </HoverCard>
  )
}

interface TrendIndicatorProps {
  trend: "up" | "down" | "neutral"
  value: string
  className?: string
}

export function TrendIndicator({ trend, value, className }: TrendIndicatorProps) {
  const trendColors = {
    up: "text-success bg-success/10",
    down: "text-destructive bg-destructive/10",
    neutral: "text-gray-500 bg-gray-100",
  }

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        trendColors[trend],
        className
      )}
    >
      <TrendIcon className="w-3 h-3" />
      {value}
    </div>
  )
}

interface ChartContainerProps {
  children: React.ReactNode
  title?: string
  className?: string
}

export function ChartContainer({ children, title, className }: ChartContainerProps) {
  return (
    <HoverCard className={className}>
      <div className="p-5" style={{ padding: "var(--space-5)" }}>
        {title && (
          <h3
            className="text-lg font-semibold mb-4"
            style={{ marginBottom: "var(--space-4)" }}
          >
            {title}
          </h3>
        )}
        {children}
      </div>
    </HoverCard>
  )
}
