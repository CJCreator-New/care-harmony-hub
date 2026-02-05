import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  Calendar,
  FileText,
  Pill,
  Stethoscope,
  ChevronRight,
  Filter,
  Download,
  Clock,
  User,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  HoverCard,
  StaggeredList,
  Tooltip,
} from "@/components/ui/micro-interactions"

interface TimelineEvent {
  id: string
  date: Date
  type: "appointment" | "lab" | "medication" | "note"
  title: string
  description: string
  provider?: string
  details?: string
  attachments?: { name: string; type: string }[]
}

interface HealthTimelineProps {
  events: TimelineEvent[]
  className?: string
}

const typeConfig = {
  appointment: {
    icon: Calendar,
    color: "bg-patient text-white",
    label: "Appointment",
  },
  lab: {
    icon: FileText,
    color: "bg-info text-white",
    label: "Lab Result",
  },
  medication: {
    icon: Pill,
    color: "bg-success text-white",
    label: "Medication",
  },
  note: {
    icon: Stethoscope,
    color: "bg-gray-500 text-white",
    label: "Clinical Note",
  },
}

function TimelineItem({
  event,
  index,
  isLeft,
}: {
  event: TimelineEvent
  index: number
  isLeft: boolean
}) {
  const shouldReduceMotion = useReducedMotion()
  const config = typeConfig[event.type]
  const Icon = config.icon
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, x: isLeft ? -50 : 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.4,
        delay: shouldReduceMotion ? 0 : index * 0.1,
      }}
      className={cn(
        "relative flex items-start gap-4",
        isLeft ? "flex-row" : "flex-row-reverse"
      )}
    >
      {/* Content */}
      <div className={cn("flex-1", isLeft ? "text-right" : "text-left")}>
        <HoverCard>
          <div className="p-4" style={{ padding: "var(--space-4)" }}>
            <div
              className={cn(
                "flex items-start gap-3",
                isLeft ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  config.color
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className={cn("flex-1", isLeft ? "text-right" : "text-left")}>
                <div
                  className={cn(
                    "flex items-center gap-2",
                    isLeft ? "justify-end" : "justify-start"
                  )}
                >
                  <Badge variant="outline" className="text-xs">
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {event.date.toLocaleDateString()}
                  </span>
                </div>
                <h4 className="font-semibold mt-1">{event.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {event.description}
                </p>
                {event.provider && (
                  <div
                    className={cn(
                      "flex items-center gap-1 mt-2 text-sm text-muted-foreground",
                      isLeft ? "justify-end" : "justify-start"
                    )}
                  >
                    <User className="w-3 h-3" />
                    {event.provider}
                  </div>
                )}

                {/* Expandable Details */}
                {event.details && (
                  <div className="mt-3">
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="text-sm text-patient hover:underline"
                    >
                      {expanded ? "Show less" : "Show more"}
                    </button>
                    {expanded && (
                      <motion.div
                        initial={shouldReduceMotion ? {} : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-2 p-3 bg-muted rounded-lg text-sm"
                      >
                        {event.details}
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Attachments */}
                {event.attachments && event.attachments.length > 0 && (
                  <div
                    className={cn(
                      "flex flex-wrap gap-2 mt-3",
                      isLeft ? "justify-end" : "justify-start"
                    )}
                  >
                    {event.attachments.map((attachment) => (
                      <Button
                        key={attachment.name}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                      >
                        <Download className="w-3 h-3" />
                        {attachment.name}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </HoverCard>
      </div>

      {/* Center Line */}
      <div className="relative flex flex-col items-center">
        <div className="w-4 h-4 rounded-full bg-patient border-4 border-background z-10" />
      </div>

      {/* Empty space for alternating layout */}
      <div className="flex-1" />
    </motion.div>
  )
}

export function HealthTimeline({ events, className }: HealthTimelineProps) {
  const [filter, setFilter] = useState<"all" | "appointment" | "lab" | "medication" | "note">("all")
  const shouldReduceMotion = useReducedMotion()

  const filteredEvents = events.filter((event) => {
    if (filter === "all") return true
    return event.type === filter
  })

  // Group events by month
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const monthKey = event.date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
    if (!acc[monthKey]) {
      acc[monthKey] = []
    }
    acc[monthKey].push(event)
    return acc
  }, {} as Record<string, TimelineEvent[]>)

  return (
    <div className={cn("space-y-6", className)} style={{ gap: "var(--space-6)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Health Timeline</h2>
          <p className="text-muted-foreground">
            {events.length} events • Showing {filteredEvents.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                {filter === "all" ? "All Events" : typeConfig[filter].label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter("all")}>
                All Events
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("appointment")}>
                Appointments
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("lab")}>
                Lab Results
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("medication")}>
                Medications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("note")}>
                Clinical Notes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Center Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" />

        <div className="space-y-8" style={{ gap: "var(--space-8)" }}>
          {Object.entries(groupedEvents).map(([month, monthEvents]) => (
            <div key={month}>
              <div className="flex items-center justify-center mb-6">
                <Badge variant="secondary" className="text-sm px-4 py-1">
                  {month}
                </Badge>
              </div>
              <div className="space-y-6" style={{ gap: "var(--space-6)" }}>
                {monthEvents.map((event, index) => (
                  <TimelineItem
                    key={event.id}
                    event={event}
                    index={index}
                    isLeft={index % 2 === 0}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div
            className="text-center py-12 text-muted-foreground"
            style={{ padding: "var(--space-12)" }}
          >
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No events found</p>
          </div>
        )}
      </div>
    </div>
  )
}
