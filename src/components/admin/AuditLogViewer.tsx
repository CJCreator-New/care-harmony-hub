import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  Shield,
  AlertTriangle,
  Info,
  Filter,
  Search,
  Calendar,
  ChevronDown,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AnimatedInput } from "@/components/ui/micro-interactions"

interface AuditLogEntry {
  id: string
  timestamp: Date
  user: string
  userId: string
  action: string
  resource: string
  severity: "info" | "warning" | "critical"
  ipAddress: string
  userAgent: string
  details?: string
}

interface AuditLogEntryProps {
  entry: AuditLogEntry
  index: number
}

const severityConfig = {
  info: {
    icon: Info,
    badgeClass: "bg-info/10 text-info border-info/20",
    bgClass: "bg-info/5",
  },
  warning: {
    icon: AlertTriangle,
    badgeClass: "bg-warning/10 text-warning border-warning/20",
    bgClass: "bg-warning/5",
  },
  critical: {
    icon: Shield,
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    bgClass: "bg-destructive/5",
  },
}

function AuditLogEntryComponent({ entry, index }: AuditLogEntryProps) {
  const shouldReduceMotion = useReducedMotion()
  const config = severityConfig[entry.severity]
  const Icon = config.icon

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3,
        delay: shouldReduceMotion ? 0 : index * 0.05,
      }}
      className={cn(
        "border-b last:border-b-0 transition-colors hover:bg-accent/30",
        config.bgClass
      )}
      style={{ padding: "var(--space-3)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "p-2 rounded-lg shrink-0",
            entry.severity === "critical" && "bg-destructive/10",
            entry.severity === "warning" && "bg-warning/10",
            entry.severity === "info" && "bg-info/10"
          )}
          style={{ padding: "var(--space-2)" }}
        >
          <Icon
            className={cn(
              "w-4 h-4",
              entry.severity === "critical" && "text-destructive",
              entry.severity === "warning" && "text-warning",
              entry.severity === "info" && "text-info"
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("font-medium", config.badgeClass)}>
              {entry.severity.toUpperCase()}
            </Badge>
            <span className="text-sm font-medium">{entry.action}</span>
            <span className="text-sm text-muted-foreground">on</span>
            <span className="text-sm font-medium">{entry.resource}</span>
          </div>

          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground"
            style={{ marginTop: "var(--space-2)" }}
          >
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {entry.timestamp.toLocaleString()}
            </span>
            <span>by {entry.user}</span>
            <span className="font-mono">{entry.ipAddress}</span>
          </div>

          {entry.details && (
            <p
              className="mt-2 text-sm text-muted-foreground bg-background/50 rounded p-2"
              style={{ marginTop: "var(--space-2)", padding: "var(--space-2)" }}
            >
              {entry.details}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

interface FilterBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  severityFilter: string[]
  onSeverityFilterChange: (severities: string[]) => void
  dateRange: { start?: Date; end?: Date }
  onDateRangeChange: (range: { start?: Date; end?: Date }) => void
}

function FilterBar({
  searchQuery,
  onSearchChange,
  severityFilter,
  onSeverityFilterChange,
}: FilterBarProps) {
  const toggleSeverity = (severity: string) => {
    if (severityFilter.includes(severity)) {
      onSeverityFilterChange(severityFilter.filter((s) => s !== severity))
    } else {
      onSeverityFilterChange([...severityFilter, severity])
    }
  }

  return (
    <div
      className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-muted/50 rounded-lg"
      style={{ padding: "var(--space-4)", gap: "var(--space-4)" }}
    >
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <AnimatedInput
          placeholder="Search audit logs..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter by severity:</span>
        {(["info", "warning", "critical"] as const).map((severity) => (
          <label
            key={severity}
            className="flex items-center gap-1.5 text-sm cursor-pointer"
          >
            <Checkbox
              checked={severityFilter.includes(severity)}
              onCheckedChange={() => toggleSeverity(severity)}
            />
            <span
              className={cn(
                severity === "critical" && "text-destructive",
                severity === "warning" && "text-warning",
                severity === "info" && "text-info"
              )}
            >
              {severity.charAt(0).toUpperCase() + severity.slice(1)}
            </span>
          </label>
        ))}
      </div>

      <Button variant="outline" size="sm" className="gap-2">
        <Download className="w-4 h-4" />
        Export
      </Button>
    </div>
  )
}

interface AuditLogViewerProps {
  entries: AuditLogEntry[]
  className?: string
}

export function AuditLogViewer({ entries, className }: AuditLogViewerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string[]>([
    "info",
    "warning",
    "critical",
  ])

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      searchQuery === "" ||
      entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.resource.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesSeverity = severityFilter.includes(entry.severity)

    return matchesSearch && matchesSeverity
  })

  return (
    <div className={cn("space-y-4", className)}>
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        severityFilter={severityFilter}
        onSeverityFilterChange={setSeverityFilter}
        dateRange={{}}
        onDateRangeChange={() => {}}
      />

      <div className="rounded-lg border overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {filteredEntries.map((entry, index) => (
            <AuditLogEntryComponent key={entry.id} entry={entry} index={index} />
          ))}
        </div>

        {filteredEntries.length === 0 && (
          <div
            className="py-12 text-center text-muted-foreground"
            style={{ padding: "var(--space-12)" }}
          >
            <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No audit logs found</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {filteredEntries.length} of {entries.length} entries</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
