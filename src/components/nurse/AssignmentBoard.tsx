import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  MoreHorizontal,
  Filter,
  Bed,
  Stethoscope,
  Pill,
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
  PulseBadge,
  StaggeredList,
  InteractiveButton,
} from "@/components/ui/micro-interactions"

interface Task {
  id: string
  title: string
  type: "medication" | "assessment" | "procedure" | "documentation"
  dueTime: Date
  completed: boolean
}

interface Patient {
  id: string
  firstName: string
  lastName: string
  room?: string
  bed?: string
  mrn: string
  age: number
  gender: string
}

interface PatientAssignment {
  patient: Patient
  priority: "low" | "medium" | "high" | "critical"
  tasks: Task[]
  lastChecked?: Date
  vitalSigns?: {
    temperature?: number
    bloodPressure?: string
    heartRate?: number
  }
}

interface PatientCardProps {
  assignment: PatientAssignment
  onClick?: () => void
  index: number
}

const priorityConfig = {
  critical: {
    color: "border-destructive",
    bgColor: "bg-destructive/5",
    badgeColor: "bg-destructive/10 text-destructive border-destructive/20",
    label: "Critical",
  },
  high: {
    color: "border-warning",
    bgColor: "bg-warning/5",
    badgeColor: "bg-warning/10 text-warning border-warning/20",
    label: "High",
  },
  medium: {
    color: "border-info",
    bgColor: "bg-info/5",
    badgeColor: "bg-info/10 text-info border-info/20",
    label: "Medium",
  },
  low: {
    color: "border-gray-300",
    bgColor: "bg-gray-50",
    badgeColor: "bg-gray-100 text-gray-600 border-gray-200",
    label: "Low",
  },
}

const taskTypeIcons = {
  medication: Pill,
  assessment: Stethoscope,
  procedure: Bed,
  documentation: CheckCircle2,
}

function PatientCard({ assignment, onClick, index }: PatientCardProps) {
  const shouldReduceMotion = useReducedMotion()
  const priority = priorityConfig[assignment.priority]
  const overdueTasks = assignment.tasks.filter(
    (task) => !task.completed && new Date() > task.dueTime
  )
  const pendingTasks = assignment.tasks.filter((task) => !task.completed)

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3,
        delay: shouldReduceMotion ? 0 : index * 0.05,
      }}
      whileHover={shouldReduceMotion ? {} : { y: -4 }}
    >
      <HoverCard>
        <div
          className={cn(
            "p-4 border-l-4 rounded-lg cursor-pointer transition-colors",
            priority.color,
            priority.bgColor
          )}
          style={{ padding: "var(--space-4)" }}
          onClick={onClick}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-nurse/10 flex items-center justify-center text-nurse font-semibold">
                {assignment.patient.firstName.charAt(0)}
                {assignment.patient.lastName.charAt(0)}
              </div>
              <div>
                <h4 className="font-semibold">
                  {assignment.patient.firstName} {assignment.patient.lastName}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {assignment.patient.age}y • {assignment.patient.gender} •{" "}
                  {assignment.patient.mrn}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={priority.badgeColor}>
                {priority.label}
              </Badge>
              {overdueTasks.length > 0 && (
                <PulseBadge count={overdueTasks.length}>
                  <div className="w-2 h-2" />
                </PulseBadge>
              )}
            </div>
          </div>

          {/* Room/Bed */}
          {(assignment.patient.room || assignment.patient.bed) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Bed className="w-4 h-4" />
              <span>
                Room {assignment.patient.room}
                {assignment.patient.bed && `, Bed ${assignment.patient.bed}`}
              </span>
            </div>
          )}

          {/* Vital Signs Preview */}
          {assignment.vitalSigns && (
            <div
              className="flex items-center gap-4 text-sm mb-3 p-2 bg-background/50 rounded"
              style={{ padding: "var(--space-2)" }}
            >
              {assignment.vitalSigns.temperature && (
                <span>Temp: {assignment.vitalSigns.temperature}°C</span>
              )}
              {assignment.vitalSigns.bloodPressure && (
                <span>BP: {assignment.vitalSigns.bloodPressure}</span>
              )}
              {assignment.vitalSigns.heartRate && (
                <span>HR: {assignment.vitalSigns.heartRate}</span>
              )}
            </div>
          )}

          {/* Tasks Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {pendingTasks.length} pending tasks
              </span>
              {assignment.lastChecked && (
                <span className="text-xs text-muted-foreground">
                  Last checked: {assignment.lastChecked.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {assignment.tasks.slice(0, 3).map((task) => {
                const TaskIcon = taskTypeIcons[task.type]
                const isOverdue = !task.completed && new Date() > task.dueTime
                return (
                  <Badge
                    key={task.id}
                    variant="outline"
                    className={cn(
                      "text-xs",
                      task.completed && "bg-success/10 text-success",
                      isOverdue && "bg-warning/10 text-warning animate-pulse"
                    )}
                  >
                    <TaskIcon className="w-3 h-3 mr-1" />
                    {task.title}
                  </Badge>
                )
              })}
              {assignment.tasks.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{assignment.tasks.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        </div>
      </HoverCard>
    </motion.div>
  )
}

interface AssignmentBoardProps {
  assignments: PatientAssignment[]
  onPatientClick?: (assignment: PatientAssignment) => void
  className?: string
}

export function AssignmentBoard({
  assignments,
  onPatientClick,
  className,
}: AssignmentBoardProps) {
  const [filter, setFilter] = useState<"all" | "critical" | "high" | "medium" | "low">("all")
  const shouldReduceMotion = useReducedMotion()

  const filteredAssignments = assignments.filter((assignment) => {
    if (filter === "all") return true
    return assignment.priority === filter
  })

  const groupedByPriority = {
    critical: filteredAssignments.filter((a) => a.priority === "critical"),
    high: filteredAssignments.filter((a) => a.priority === "high"),
    medium: filteredAssignments.filter((a) => a.priority === "medium"),
    low: filteredAssignments.filter((a) => a.priority === "low"),
  }

  return (
    <div className={cn("space-y-6", className)} style={{ gap: "var(--space-6)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Patient Assignment Board</h2>
          <p className="text-muted-foreground">
            {assignments.length} patients assigned
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter("all")}>
                All Patients
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("critical")}>
                Critical Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("high")}>
                High Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("medium")}>
                Medium Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("low")}>
                Low Priority
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ gap: "var(--space-4)" }}>
        {(Object.keys(groupedByPriority) as Array<keyof typeof groupedByPriority>).map(
          (priority) => (
            <div key={priority} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold capitalize flex items-center gap-2">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      priority === "critical" && "bg-destructive",
                      priority === "high" && "bg-warning",
                      priority === "medium" && "bg-info",
                      priority === "low" && "bg-gray-300"
                    )}
                  />
                  {priority}
                </h3>
                <Badge variant="secondary">{groupedByPriority[priority].length}</Badge>
              </div>
              <div className="space-y-3" style={{ gap: "var(--space-3)" }}>
                <StaggeredList staggerDelay={0.05}>
                  {groupedByPriority[priority].map((assignment, index) => (
                    <PatientCard
                      key={assignment.patient.id}
                      assignment={assignment}
                      onClick={() => onPatientClick?.(assignment)}
                      index={index}
                    />
                  ))}
                </StaggeredList>
              </div>
            </div>
          )
        )}
      </div>

      {filteredAssignments.length === 0 && (
        <div
          className="text-center py-12 text-muted-foreground"
          style={{ padding: "var(--space-12)" }}
        >
          <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No patients assigned</p>
        </div>
      )}
    </div>
  )
}
