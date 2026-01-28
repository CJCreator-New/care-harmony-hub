import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, useReducedMotion, AnimatePresence } from "framer-motion"
import {
  Heart,
  Thermometer,
  Activity,
  Wind,
  Droplets,
  FileText,
  FlaskConical,
  StickyNote,
  ChevronRight,
  Clock,
  User,
  Calendar,
  AlertCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  HoverCard,
  StaggeredList,
  PageTransition,
} from "@/components/ui/micro-interactions"

interface VitalSigns {
  temperature: number
  bloodPressure: { systolic: number; diastolic: number }
  heartRate: number
  respiratoryRate: number
  oxygenSaturation: number
}

interface Patient {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: string
  mrn: string
  allergies: string[]
  chronicConditions: string[]
}

interface TimelineEntry {
  id: string
  date: Date
  type: "visit" | "lab" | "medication" | "note"
  title: string
  description: string
  provider?: string
}

interface PatientChartProps {
  patient: Patient
  vitalSigns: VitalSigns
  timeline: TimelineEntry[]
  activeTab?: "overview" | "history" | "labs" | "notes"
}

function VitalSignCard({
  icon: Icon,
  label,
  value,
  unit,
  status,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  unit: string
  status: "normal" | "warning" | "critical"
}) {
  const statusColors = {
    normal: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    critical: "bg-destructive/10 text-destructive border-destructive/20",
  }

  return (
    <HoverCard className="h-full">
      <div className="p-4" style={{ padding: "var(--space-4)" }}>
        <div className="flex items-center gap-3 mb-2">
          <div
            className={cn("p-2 rounded-lg", statusColors[status])}
            style={{ padding: "var(--space-2)" }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
      </div>
    </HoverCard>
  )
}

function VitalSignsPanel({ vitals }: { vitals: VitalSigns }) {
  const getTempStatus = (temp: number): "normal" | "warning" | "critical" => {
    if (temp < 36 || temp > 38) return "warning"
    if (temp > 39) return "critical"
    return "normal"
  }

  const getBPStatus = (sys: number, dia: number): "normal" | "warning" | "critical" => {
    if (sys > 140 || dia > 90) return "warning"
    if (sys > 180 || dia > 120) return "critical"
    return "normal"
  }

  const getHRStatus = (hr: number): "normal" | "warning" | "critical" => {
    if (hr < 60 || hr > 100) return "warning"
    if (hr < 50 || hr > 120) return "critical"
    return "normal"
  }

  return (
    <div className="space-y-4">
      <h3
        className="text-lg font-semibold flex items-center gap-2"
        style={{ marginBottom: "var(--space-4)" }}
      >
        <Activity className="w-5 h-5 text-doctor" />
        Vital Signs
      </h3>
      <div className="grid grid-cols-2 gap-3" style={{ gap: "var(--space-3)" }}>
        <VitalSignCard
          icon={Thermometer}
          label="Temperature"
          value={vitals.temperature.toFixed(1)}
          unit="°C"
          status={getTempStatus(vitals.temperature)}
        />
        <VitalSignCard
          icon={Heart}
          label="Blood Pressure"
          value={`${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`}
          unit="mmHg"
          status={getBPStatus(vitals.bloodPressure.systolic, vitals.bloodPressure.diastolic)}
        />
        <VitalSignCard
          icon={Activity}
          label="Heart Rate"
          value={vitals.heartRate}
          unit="bpm"
          status={getHRStatus(vitals.heartRate)}
        />
        <VitalSignCard
          icon={Wind}
          label="Respiratory Rate"
          value={vitals.respiratoryRate}
          unit="/min"
          status={vitals.respiratoryRate > 20 ? "warning" : "normal"}
        />
        <VitalSignCard
          icon={Droplets}
          label="O₂ Saturation"
          value={vitals.oxygenSaturation}
          unit="%"
          status={vitals.oxygenSaturation < 95 ? "warning" : "normal"}
        />
      </div>
    </div>
  )
}

function MedicalHistoryTimeline({ entries }: { entries: TimelineEntry[] }) {
  const shouldReduceMotion = useReducedMotion()

  const typeIcons = {
    visit: User,
    lab: FlaskConical,
    medication: Activity,
    note: StickyNote,
  }

  const typeColors = {
    visit: "bg-doctor/10 text-doctor",
    lab: "bg-info/10 text-info",
    medication: "bg-success/10 text-success",
    note: "bg-gray-100 text-gray-600",
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Medical History</h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
        <StaggeredList staggerDelay={0.05}>
          {entries.map((entry, index) => {
            const Icon = typeIcons[entry.type]
            return (
              <motion.div
                key={entry.id}
                initial={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.3,
                  delay: shouldReduceMotion ? 0 : index * 0.05,
                }}
                className="relative pl-10 pb-6 last:pb-0"
              >
                <div
                  className={cn(
                    "absolute left-0 w-8 h-8 rounded-full flex items-center justify-center",
                    typeColors[entry.type]
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="bg-muted/50 rounded-lg p-4" style={{ padding: "var(--space-4)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{entry.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {entry.date.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.description}</p>
                  {entry.provider && (
                    <p className="text-xs text-muted-foreground mt-2">
                      by {entry.provider}
                    </p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </StaggeredList>
      </div>
    </div>
  )
}

export function PatientChart({
  patient,
  vitalSigns,
  timeline,
  activeTab = "overview",
}: PatientChartProps) {
  const [currentTab, setCurrentTab] = useState(activeTab)

  return (
    <div className="space-y-6" style={{ gap: "var(--space-6)" }}>
      {/* Patient Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-doctor/10 flex items-center justify-center text-doctor text-2xl font-bold">
            {patient.firstName.charAt(0)}
            {patient.lastName.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {patient.firstName} {patient.lastName}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {patient.mrn}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {patient.dateOfBirth.toLocaleDateString()}
              </span>
              <Badge variant="outline">{patient.gender}</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {patient.allergies.length > 0 && (
            <Badge
              variant="outline"
              className="bg-destructive/10 text-destructive border-destructive/20"
            >
              <AlertCircle className="w-3 h-3 mr-1" />
              {patient.allergies.length} Allergies
            </Badge>
          )}
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Edit Chart
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {patient.allergies.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4" style={{ padding: "var(--space-4)" }}>
          <div className="flex items-center gap-2 text-destructive font-medium mb-2">
            <AlertCircle className="w-5 h-5" />
            Allergies
          </div>
          <div className="flex flex-wrap gap-2">
            {patient.allergies.map((allergy) => (
              <Badge
                key={allergy}
                variant="outline"
                className="bg-destructive/10 text-destructive border-destructive/20"
              >
                {allergy}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="labs">Lab Results</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ gap: "var(--space-6)" }}>
            {/* Vitals Column */}
            <div className="lg:col-span-1">
              <VitalSignsPanel vitals={vitalSigns} />
            </div>

            {/* Main Content Column */}
            <div className="lg:col-span-2 space-y-6">
              <HoverCard>
                <div className="p-5" style={{ padding: "var(--space-5)" }}>
                  <h3 className="text-lg font-semibold mb-4">Chronic Conditions</h3>
                  {patient.chronicConditions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patient.chronicConditions.map((condition) => (
                        <Badge key={condition} variant="secondary">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No chronic conditions recorded</p>
                  )}
                </div>
              </HoverCard>

              <HoverCard>
                <div className="p-5" style={{ padding: "var(--space-5)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Recent Activity</h3>
                    <Button variant="ghost" size="sm">
                      View All
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {timeline.slice(0, 3).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium">{entry.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {entry.date.toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">{entry.type}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </HoverCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <MedicalHistoryTimeline entries={timeline} />
        </TabsContent>

        <TabsContent value="labs" className="mt-6">
          <HoverCard>
            <div className="p-8 text-center" style={{ padding: "var(--space-8)" }}>
              <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Lab Results</h3>
              <p className="text-muted-foreground">
                Lab results will be displayed here. Integration with lab system required.
              </p>
            </div>
          </HoverCard>
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <HoverCard>
            <div className="p-8 text-center" style={{ padding: "var(--space-8)" }}>
              <StickyNote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Clinical Notes</h3>
              <p className="text-muted-foreground">
                Clinical notes will be displayed here.
              </p>
            </div>
          </HoverCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
