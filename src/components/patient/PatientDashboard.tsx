import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  Heart,
  Pill,
  Calendar,
  MessageSquare,
  Activity,
  ChevronRight,
  Bell,
  User,
  FileText,
  TrendingUp,
  Clock,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  HoverCard,
  MetricCard,
  PulseBadge,
  StaggeredList,
} from "@/components/ui/micro-interactions"

interface HealthSummaryProps {
  latestVitals: {
    temperature?: number
    bloodPressure?: string
    heartRate?: number
  }
  activeMedications: number
  upcomingAppointments: number
  unreadMessages: number
}

interface UpcomingAppointment {
  id: string
  date: Date
  provider: string
  specialty: string
  type: string
  location: string
}

interface PatientDashboardProps {
  patientName: string
  healthSummary: HealthSummaryProps
  upcomingAppointments: UpcomingAppointment[]
  recentActivity: {
    id: string
    type: "lab" | "appointment" | "medication" | "message"
    title: string
    date: Date
    description: string
  }[]
}

function HealthMetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
  index,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subtext: string
  color: string
  index: number
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3,
        delay: shouldReduceMotion ? 0 : index * 0.1,
      }}
    >
      <HoverCard liftAmount={4}>
        <div className="p-5" style={{ padding: "var(--space-5)" }}>
          <div className="flex items-start justify-between">
            <div className={cn("p-2 rounded-lg", color)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
          </div>
        </div>
      </HoverCard>
    </motion.div>
  )
}

function AppointmentCard({
  appointment,
  index,
}: {
  appointment: UpcomingAppointment
  index: number
}) {
  const shouldReduceMotion = useReducedMotion()
  const isToday = new Date().toDateString() === appointment.date.toDateString()

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3,
        delay: shouldReduceMotion ? 0 : index * 0.05,
      }}
    >
      <HoverCard>
        <div className="p-4" style={{ padding: "var(--space-4)" }}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-patient/10 flex items-center justify-center text-patient font-semibold">
                {appointment.date.getDate()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{appointment.type}</h4>
                  {isToday && (
                    <Badge className="bg-patient text-white">Today</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  with {appointment.provider}
                </p>
                <p className="text-xs text-muted-foreground">
                  {appointment.specialty}
                </p>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {appointment.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  <span>•</span>
                  <span>{appointment.location}</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </HoverCard>
    </motion.div>
  )
}

function ActivityItem({
  activity,
  index,
}: {
  activity: {
    id: string
    type: "lab" | "appointment" | "medication" | "message"
    title: string
    date: Date
    description: string
  }
  index: number
}) {
  const shouldReduceMotion = useReducedMotion()

  const typeConfig = {
    lab: { icon: FileText, color: "bg-info text-info-foreground" },
    appointment: { icon: Calendar, color: "bg-patient text-white" },
    medication: { icon: Pill, color: "bg-success text-success-foreground" },
    message: { icon: MessageSquare, color: "bg-gray-500 text-white" },
  }

  const config = typeConfig[activity.type]
  const Icon = config.icon

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3,
        delay: shouldReduceMotion ? 0 : index * 0.05,
      }}
      className="flex items-start gap-3 py-3 border-b last:border-0"
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{activity.title}</p>
        <p className="text-sm text-muted-foreground truncate">
          {activity.description}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {activity.date.toLocaleDateString()}
        </p>
      </div>
    </motion.div>
  )
}

export function PatientDashboard({
  patientName,
  healthSummary,
  upcomingAppointments,
  recentActivity,
}: PatientDashboardProps) {
  const shouldReduceMotion = useReducedMotion()
  const currentHour = new Date().getHours()
  const greeting =
    currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening"

  return (
    <div className="space-y-6" style={{ gap: "var(--space-6)" }}>
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={shouldReduceMotion ? {} : { opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold"
          >
            {greeting}, {patientName.split(" ")[0]}
          </motion.h1>
          <p className="text-muted-foreground">
            Here's your health summary for today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {healthSummary.unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-patient text-white text-xs rounded-full flex items-center justify-center">
                {healthSummary.unreadMessages}
              </span>
            )}
          </Button>
          <div className="w-10 h-10 rounded-full bg-patient/10 flex items-center justify-center text-patient font-semibold">
            {patientName.charAt(0)}
          </div>
        </div>
      </div>

      {/* Health Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ gap: "var(--space-4)" }}>
        <HealthMetricCard
          icon={Activity}
          label="Latest Vitals"
          value={healthSummary.latestVitals.heartRate ? `${healthSummary.latestVitals.heartRate} bpm` : "--"}
          subtext="Heart rate"
          color="bg-patient"
          index={0}
        />
        <HealthMetricCard
          icon={Pill}
          label="Active Medications"
          value={healthSummary.activeMedications}
          subtext="Prescriptions"
          color="bg-success"
          index={1}
        />
        <HealthMetricCard
          icon={Calendar}
          label="Upcoming"
          value={healthSummary.upcomingAppointments}
          subtext="Appointments"
          color="bg-info"
          index={2}
        />
        <HealthMetricCard
          icon={MessageSquare}
          label="Messages"
          value={healthSummary.unreadMessages}
          subtext="Unread"
          color="bg-warning"
          index={3}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ gap: "var(--space-6)" }}>
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Upcoming Appointments</h2>
            <Button variant="ghost" size="sm" className="gap-1">
              View all
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-3" style={{ gap: "var(--space-3)" }}>
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment, index) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  index={index}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming appointments</p>
                <Button variant="outline" className="mt-4">
                  Schedule Appointment
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </div>
          <HoverCard>
            <div className="p-4" style={{ padding: "var(--space-4)" }}>
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <ActivityItem key={activity.id} activity={activity} index={index} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </HoverCard>

          {/* Quick Actions */}
          <div className="space-y-2">
            <h3 className="font-semibold">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1">
                <Calendar className="w-5 h-5" />
                <span className="text-xs">Book Appt</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1">
                <Pill className="w-5 h-5" />
                <span className="text-xs">Refill Rx</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1">
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs">Message</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1">
                <FileText className="w-5 h-5" />
                <span className="text-xs">Records</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
