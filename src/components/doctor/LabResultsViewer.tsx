import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Check,
  Info,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  HoverCard,
  Tooltip,
  StaggeredList,
} from "@/components/ui/micro-interactions"

interface LabTest {
  id: string
  name: string
  category: string
  unit: string
  referenceRange: { min: number; max: number }
}

interface LabResult {
  id: string
  test: LabTest
  value: number
  timestamp: Date
  status: "normal" | "abnormal" | "critical"
  notes?: string
  orderedBy: string
}

interface LabResultProps {
  result: LabResult
  index: number
}

const statusConfig = {
  normal: {
    icon: Check,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/20",
    label: "Normal",
  },
  abnormal: {
    icon: AlertCircle,
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/20",
    label: "Abnormal",
  },
  critical: {
    icon: AlertCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/20",
    label: "Critical",
  },
}

function getStatus(value: number, min: number, max: number): "normal" | "abnormal" | "critical" {
  const range = max - min
  const criticalMargin = range * 0.2

  if (value < min - criticalMargin || value > max + criticalMargin) {
    return "critical"
  }
  if (value < min || value > max) {
    return "abnormal"
  }
  return "normal"
}

function ResultCard({ result, index }: LabResultProps) {
  const [expanded, setExpanded] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const status = statusConfig[result.status]
  const StatusIcon = status.icon

  const isHigh = result.value > result.test.referenceRange.max
  const isLow = result.value < result.test.referenceRange.min

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3,
        delay: shouldReduceMotion ? 0 : index * 0.05,
      }}
    >
      <HoverCard>
        <div className="p-4" style={{ padding: "var(--space-4)" }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  status.bgColor
                )}
              >
                <FlaskConical className={cn("w-5 h-5", status.color)} />
              </div>
              <div>
                <h4 className="font-semibold">{result.test.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {result.test.category}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <span
                  className={cn(
                    "text-2xl font-bold",
                    result.status === "normal" ? "text-foreground" : status.color
                  )}
                >
                  {result.value.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {result.test.unit}
                </span>
              </div>
              <Badge
                variant="outline"
                className={cn("mt-1", status.bgColor, status.color, status.borderColor)}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
          </div>

          {/* Reference Range */}
          <div
            className="mt-4 pt-4 border-t"
            style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)" }}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Reference Range</span>
              <span className="font-medium">
                {result.test.referenceRange.min} - {result.test.referenceRange.max}{" "}
                {result.test.unit}
              </span>
            </div>

            {/* Visual indicator */}
            <div className="mt-2 relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-success/30 rounded-full"
                style={{
                  left: "20%",
                  right: "20%",
                }}
              />
              <motion.div
                className={cn(
                  "absolute w-3 h-3 rounded-full -mt-0.5",
                  result.status === "normal" ? "bg-success" : status.color.replace("text-", "bg-")
                )}
                initial={shouldReduceMotion ? {} : { left: "50%" }}
                animate={{
                  left: `${Math.min(
                    100,
                    Math.max(
                      0,
                      ((result.value - result.test.referenceRange.min * 0.5) /
                        (result.test.referenceRange.max * 1.5 - result.test.referenceRange.min * 0.5)) *
                        100
                    )
                  )}%`,
                }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: 0.2 }}
              />
            </div>

            {/* Trend indicator */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1 text-sm">
                {isHigh ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-warning" />
                    <span className="text-warning">High</span>
                  </>
                ) : isLow ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-warning" />
                    <span className="text-warning">Low</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4 text-success" />
                    <span className="text-success">Within range</span>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Expanded details */}
          {expanded && (
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 pt-4 border-t text-sm"
              style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)" }}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Tested on {result.timestamp.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Info className="w-4 h-4" />
                  <span>Ordered by {result.orderedBy}</span>
                </div>
                {result.notes && (
                  <div className="mt-2 p-2 bg-muted rounded">
                    <span className="font-medium">Notes:</span> {result.notes}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </HoverCard>
    </motion.div>
  )
}

interface LabResultsViewerProps {
  results: LabResult[]
  className?: string
}

export function LabResultsViewer({ results, className }: LabResultsViewerProps) {
  const [filter, setFilter] = useState<"all" | "abnormal" | "critical">("all")
  const shouldReduceMotion = useReducedMotion()

  const filteredResults = results.filter((result) => {
    if (filter === "all") return true
    return result.status === filter
  })

  const abnormalCount = results.filter((r) => r.status === "abnormal").length
  const criticalCount = results.filter((r) => r.status === "critical").length

  return (
    <div className={cn("space-y-6", className)} style={{ gap: "var(--space-6)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Lab Results</h2>
          <p className="text-muted-foreground">
            {results.length} tests • {abnormalCount} abnormal • {criticalCount} critical
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All Results
          <Badge variant="secondary" className="ml-2">
            {results.length}
          </Badge>
        </Button>
        <Button
          variant={filter === "abnormal" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("abnormal")}
          className={filter === "abnormal" ? "bg-warning hover:bg-warning/90" : ""}
        >
          Abnormal
          <Badge variant="secondary" className="ml-2">
            {abnormalCount}
          </Badge>
        </Button>
        <Button
          variant={filter === "critical" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("critical")}
          className={filter === "critical" ? "bg-destructive hover:bg-destructive/90" : ""}
        >
          Critical
          <Badge variant="secondary" className="ml-2">
            {criticalCount}
          </Badge>
        </Button>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ gap: "var(--space-4)" }}>
        <StaggeredList staggerDelay={0.05}>
          {filteredResults.map((result, index) => (
            <ResultCard key={result.id} result={result} index={index} />
          ))}
        </StaggeredList>
      </div>

      {filteredResults.length === 0 && (
        <div
          className="text-center py-12 text-muted-foreground"
          style={{ padding: "var(--space-12)" }}
        >
          <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No lab results found</p>
        </div>
      )}
    </div>
  )
}
