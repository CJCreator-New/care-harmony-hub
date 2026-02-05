import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  MessageSquare,
  TrendingUp,
  Info,
  Calendar,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  HoverCard,
  StaggeredList,
  InteractiveButton,
  Toast,
} from "@/components/ui/micro-interactions"

interface LabTest {
  id: string
  name: string
  category: string
  unit: string
}

interface TestResult {
  id: string
  test: LabTest
  result: number
  referenceRange: { min: number; max: number }
  status: "normal" | "abnormal" | "critical"
  testedAt: Date
  provider: string
  notes?: string
  explanation?: string
  trend?: { date: Date; value: number }[]
}

interface TestResultsViewerProps {
  results: TestResult[]
  onMessageProvider: (provider: string) => void
  className?: string
}

const statusConfig = {
  normal: {
    icon: CheckCircle2,
    label: "Normal",
    badgeClass: "bg-success/10 text-success border-success/20",
    bgClass: "bg-success/5",
    iconClass: "text-success",
  },
  abnormal: {
    icon: AlertCircle,
    label: "Abnormal",
    badgeClass: "bg-warning/10 text-warning border-warning/20",
    bgClass: "bg-warning/5",
    iconClass: "text-warning",
  },
  critical: {
    icon: AlertTriangle,
    label: "Critical",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    bgClass: "bg-destructive/5",
    iconClass: "text-destructive",
  },
}

function ResultCard({
  result,
  onMessageProvider,
  index,
}: {
  result: TestResult
  onMessageProvider: (provider: string) => void
  index: number
}) {
  const shouldReduceMotion = useReducedMotion()
  const [expanded, setExpanded] = useState(false)
  const [showContactDialog, setShowContactDialog] = useState(false)
  const status = statusConfig[result.status]
  const StatusIcon = status.icon

  const isHigh = result.result > result.referenceRange.max
  const isLow = result.result < result.referenceRange.min

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
        <div className={cn("rounded-lg border p-4", status.bgClass)} style={{ padding: "var(--space-4)" }}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  status.bgClass.replace("/5", "/10")
                )}
              >
                <StatusIcon className={cn("w-5 h-5", status.iconClass)} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{result.test.name}</h4>
                  <Badge variant="outline" className={status.badgeClass}>
                    {status.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {result.test.category}
                </p>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {result.testedAt.toLocaleDateString()}
                  <span>•</span>
                  <span>{result.provider}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-baseline gap-1 justify-end">
                <span
                  className={cn(
                    "text-3xl font-bold",
                    result.status === "normal" ? "text-foreground" : status.iconClass
                  )}
                >
                  {result.result.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {result.test.unit}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Reference: {result.referenceRange.min}-{result.referenceRange.max}{" "}
                {result.test.unit}
              </p>
            </div>
          </div>

          {/* Visual Indicator */}
          <div className="mt-4">
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-success/30 rounded-full"
                style={{
                  left: `${((result.referenceRange.min - result.referenceRange.min * 0.5) / (result.referenceRange.max * 1.5 - result.referenceRange.min * 0.5)) * 100}%`,
                  right: `${100 - ((result.referenceRange.max - result.referenceRange.min * 0.5) / (result.referenceRange.max * 1.5 - result.referenceRange.min * 0.5)) * 100}%`,
                }}
              />
              <motion.div
                className={cn(
                  "absolute w-3 h-3 rounded-full -mt-0.5",
                  result.status === "normal" ? "bg-success" : status.iconClass.replace("text-", "bg-")
                )}
                initial={shouldReduceMotion ? {} : { left: "50%" }}
                animate={{
                  left: `${Math.min(
                    100,
                    Math.max(
                      0,
                      ((result.result - result.referenceRange.min * 0.5) /
                        (result.referenceRange.max * 1.5 - result.referenceRange.min * 0.5)) *
                        100
                    )
                  )}%`,
                }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.5, delay: 0.2 }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Low</span>
              <span>Normal Range</span>
              <span>High</span>
            </div>
          </div>

          {/* Explanation */}
          {result.explanation && (
            <div className="mt-4 p-3 bg-background rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-patient" />
                <span className="font-medium text-sm">What does this mean?</span>
              </div>
              <p className="text-sm text-muted-foreground">{result.explanation}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="gap-1"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show more
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" className="gap-1">
              <Download className="w-4 h-4" />
              Download
            </Button>
            {result.status !== "normal" && (
              <InteractiveButton
                size="sm"
                onClick={() => setShowContactDialog(true)}
                className="gap-1"
              >
                <MessageSquare className="w-4 h-4" />
                Contact Provider
              </InteractiveButton>
            )}
          </div>

          {/* Expanded Details */}
          {expanded && result.trend && (
            <motion.div
              initial={shouldReduceMotion ? {} : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 pt-4 border-t"
            >
              <h5 className="font-medium text-sm mb-3">Your Trend Over Time</h5>
              <div className="h-32 flex items-end gap-2">
                {result.trend.map((point) => (
                  <div
                    key={`${point.date.toISOString()}-${point.value}`}
                    className="flex-1 flex flex-col items-center"
                  >
                    <div
                      className={cn(
                        "w-full rounded-t transition-all",
                        point.value >= result.referenceRange.min &&
                          point.value <= result.referenceRange.max
                          ? "bg-success/50"
                          : "bg-warning/50"
                      )}
                      style={{
                        height: `${(point.value / (result.referenceRange.max * 1.5)) * 100}%`,
                      }}
                    />
                    <span className="text-xs text-muted-foreground mt-1">
                      {point.date.toLocaleDateString(undefined, { month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </HoverCard>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Your Provider</DialogTitle>
            <DialogDescription>
              Your {result.test.name} result is {result.status}. Would you like to
              message your provider about this?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted rounded-lg p-4">
              <p className="font-medium">{result.provider}</p>
              <p className="text-sm text-muted-foreground">
                {result.test.name}: {result.result} {result.test.unit} ({result.status})
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContactDialog(false)}>
              Not Now
            </Button>
            <InteractiveButton
              onClick={() => {
                onMessageProvider(result.provider)
                setShowContactDialog(false)
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Message
            </InteractiveButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

export function TestResultsViewer({
  results,
  onMessageProvider,
  className,
}: TestResultsViewerProps) {
  const [filter, setFilter] = useState<"all" | "normal" | "abnormal" | "critical">("all")
  const shouldReduceMotion = useReducedMotion()

  const filteredResults = results.filter((result) => {
    if (filter === "all") return true
    return result.status === filter
  })

  const normalCount = results.filter((r) => r.status === "normal").length
  const abnormalCount = results.filter((r) => r.status === "abnormal").length
  const criticalCount = results.filter((r) => r.status === "critical").length

  return (
    <div className={cn("space-y-6", className)} style={{ gap: "var(--space-6)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Test Results</h2>
          <p className="text-muted-foreground">
            {results.length} results • {normalCount} normal, {abnormalCount} abnormal,{" "}
            {criticalCount} critical
          </p>
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
        </Button>
        <Button
          variant={filter === "normal" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("normal")}
          className={filter === "normal" ? "bg-success hover:bg-success/90" : ""}
        >
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Normal
        </Button>
        <Button
          variant={filter === "abnormal" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("abnormal")}
          className={filter === "abnormal" ? "bg-warning hover:bg-warning/90" : ""}
        >
          <AlertCircle className="w-4 h-4 mr-1" />
          Abnormal
        </Button>
        <Button
          variant={filter === "critical" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("critical")}
          className={filter === "critical" ? "bg-destructive hover:bg-destructive/90" : ""}
        >
          <AlertTriangle className="w-4 h-4 mr-1" />
          Critical
        </Button>
      </div>

      {/* Results List */}
      <div className="space-y-4" style={{ gap: "var(--space-4)" }}>
        <StaggeredList staggerDelay={0.05}>
          {filteredResults.map((result, index) => (
            <ResultCard
              key={result.id}
              result={result}
              onMessageProvider={onMessageProvider}
              index={index}
            />
          ))}
        </StaggeredList>
      </div>

      {filteredResults.length === 0 && (
        <div
          className="text-center py-12 text-muted-foreground"
          style={{ padding: "var(--space-12)" }}
        >
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No test results found</p>
        </div>
      )}
    </div>
  )
}
