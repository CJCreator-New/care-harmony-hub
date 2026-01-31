import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, useReducedMotion, AnimatePresence } from "framer-motion"
import {
  User,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  Send,
  Printer,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  HoverCard,
  InteractiveButton,
  StaggeredList,
  Toast,
} from "@/components/ui/micro-interactions"

interface Task {
  id: string
  title: string
  completed: boolean
  priority: "low" | "medium" | "high"
}

interface Event {
  id: string
  timestamp: Date
  type: "assessment" | "medication" | "procedure" | "incident" | "other"
  description: string
  provider: string
}

interface Patient {
  id: string
  firstName: string
  lastName: string
  room?: string
  mrn: string
  age: number
  gender: string
}

interface PatientSummary {
  patient: Patient
  keyEvents: Event[]
  pendingTasks: Task[]
  criticalNotes: string
  situation: string
  background: string
  assessment: string
  recommendation: string
}

interface HandoverReportProps {
  shift: "day" | "evening" | "night"
  date: Date
  fromNurse: string
  toNurse: string
  patientSummaries: PatientSummary[]
  onComplete: () => void
}

const eventTypeIcons = {
  assessment: ClipboardList,
  medication: CheckCircle2,
  procedure: FileText,
  incident: AlertCircle,
  other: Clock,
}

const eventTypeColors = {
  assessment: "bg-info/10 text-info",
  medication: "bg-success/10 text-success",
  procedure: "bg-doctor/10 text-doctor",
  incident: "bg-destructive/10 text-destructive",
  other: "bg-gray-100 text-gray-600",
}

function PatientSummaryCard({
  summary,
  index,
}: {
  summary: PatientSummary
  index: number
}) {
  const shouldReduceMotion = useReducedMotion()
  const [isOpen, setIsOpen] = useState(false)

  const completedTasks = summary.pendingTasks.filter((t) => t.completed).length
  const totalTasks = summary.pendingTasks.length

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
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
            style={{ padding: "var(--space-4)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-nurse/10 flex items-center justify-center text-nurse font-semibold">
                {summary.patient.firstName.charAt(0)}
                {summary.patient.lastName.charAt(0)}
              </div>
              <div className="text-left">
                <h4 className="font-semibold">
                  {summary.patient.firstName} {summary.patient.lastName}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {summary.patient.age}y • {summary.patient.gender} • Room{" "}
                  {summary.patient.room}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {summary.criticalNotes && (
                <Badge
                  variant="outline"
                  className="bg-destructive/10 text-destructive border-destructive/20"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Critical
                </Badge>
              )}
              <Badge variant="secondary">
                {completedTasks}/{totalTasks} Tasks
              </Badge>
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </button>

          {/* Content */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={shouldReduceMotion ? {} : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={shouldReduceMotion ? {} : { height: 0, opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              >
                <div
                  className="p-4 border-t space-y-4"
                  style={{ padding: "var(--space-4)", gap: "var(--space-4)" }}
                >
                  {/* Critical Notes */}
                  {summary.criticalNotes && (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-destructive font-medium mb-1">
                        <AlertCircle className="w-4 h-4" />
                        Critical Notes
                      </div>
                      <p className="text-sm text-destructive/80">
                        {summary.criticalNotes}
                      </p>
                    </div>
                  )}

                  {/* SBAR */}
                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-semibold text-nurse mb-1">
                        S - Situation
                      </h5>
                      <p className="text-sm text-muted-foreground">
                        {summary.situation}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-nurse mb-1">
                        B - Background
                      </h5>
                      <p className="text-sm text-muted-foreground">
                        {summary.background}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-nurse mb-1">
                        A - Assessment
                      </h5>
                      <p className="text-sm text-muted-foreground">
                        {summary.assessment}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-nurse mb-1">
                        R - Recommendation
                      </h5>
                      <p className="text-sm text-muted-foreground">
                        {summary.recommendation}
                      </p>
                    </div>
                  </div>

                  {/* Key Events */}
                  <div>
                    <h5 className="text-sm font-semibold mb-2">Key Events</h5>
                    <div className="space-y-2">
                      {summary.keyEvents.map((event) => {
                        const EventIcon = eventTypeIcons[event.type]
                        return (
                          <div
                            key={event.id}
                            className="flex items-start gap-2 text-sm"
                          >
                            <div
                              className={cn(
                                "p-1 rounded",
                                eventTypeColors[event.type]
                              )}
                            >
                              <EventIcon className="w-3 h-3" />
                            </div>
                            <div className="flex-1">
                              <p>{event.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {event.timestamp.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                • {event.provider}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Pending Tasks */}
                  <div>
                    <h5 className="text-sm font-semibold mb-2">Pending Tasks</h5>
                    <div className="space-y-2">
                      {summary.pendingTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox checked={task.completed} />
                          <span
                            className={cn(
                              task.completed && "line-through text-muted-foreground"
                            )}
                          >
                            {task.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs ml-auto",
                              task.priority === "high" &&
                                "bg-destructive/10 text-destructive",
                              task.priority === "medium" &&
                                "bg-warning/10 text-warning",
                              task.priority === "low" && "bg-gray-100 text-gray-600"
                            )}
                          >
                            {task.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </HoverCard>
    </motion.div>
  )
}

export function HandoverReport({
  shift,
  date,
  fromNurse,
  toNurse,
  patientSummaries,
  onComplete,
}: HandoverReportProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  const handleSubmit = async () => {
    setIsSubmitting(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitting(false)
    setShowToast(true)
    onComplete()
  }

  const handleSaveDraft = async () => {
    // Simulate saving draft
    await new Promise((resolve) => setTimeout(resolve, 500))
    setShowToast(true)
    // Don't call onComplete for draft save
  }

  const shiftLabels = {
    day: "Day Shift",
    evening: "Evening Shift",
    night: "Night Shift",
  }

  return (
    <div className="space-y-6" style={{ gap: "var(--space-6)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Shift Handover Report</h2>
          <p className="text-muted-foreground">
            {shiftLabels[shift]} • {date.toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Nurse Info */}
      <div className="grid grid-cols-2 gap-4" style={{ gap: "var(--space-4)" }}>
        <div className="p-4 bg-muted rounded-lg" style={{ padding: "var(--space-4)" }}>
          <p className="text-sm text-muted-foreground mb-1">From</p>
          <p className="font-semibold">{fromNurse}</p>
          <p className="text-sm text-muted-foreground">Outgoing Nurse</p>
        </div>
        <div className="p-4 bg-muted rounded-lg" style={{ padding: "var(--space-4)" }}>
          <p className="text-sm text-muted-foreground mb-1">To</p>
          <p className="font-semibold">{toNurse}</p>
          <p className="text-sm text-muted-foreground">Incoming Nurse</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="flex flex-wrap gap-4">
        <Badge variant="outline" className="text-sm px-3 py-1">
          <User className="w-4 h-4 mr-2" />
          {patientSummaries.length} Patients
        </Badge>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <ClipboardList className="w-4 h-4 mr-2" />
          {patientSummaries.reduce((sum, s) => sum + s.pendingTasks.length, 0)} Tasks
        </Badge>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <AlertCircle className="w-4 h-4 mr-2" />
          {patientSummaries.filter((s) => s.criticalNotes).length} Critical
        </Badge>
      </div>

      {/* Patient Summaries */}
      <div className="space-y-4" style={{ gap: "var(--space-4)" }}>
        <h3 className="text-lg font-semibold">Patient Summaries</h3>
        <StaggeredList staggerDelay={0.05}>
          {patientSummaries.map((summary, index) => (
            <PatientSummaryCard
              key={summary.patient.id}
              summary={summary}
              index={index}
            />
          ))}
        </StaggeredList>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={handleSaveDraft}>Save Draft</Button>
        <InteractiveButton
          onClick={handleSubmit}
          isLoading={isSubmitting}
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          Complete Handover
        </InteractiveButton>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast
            title="Handover Complete"
            description="The shift handover has been successfully completed."
            variant="success"
            onClose={() => setShowToast(false)}
          />
        </div>
      )}
    </div>
  )
}
