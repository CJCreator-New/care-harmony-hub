import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, useReducedMotion, AnimatePresence } from "framer-motion"
import {
  Pill,
  Clock,
  Check,
  AlertCircle,
  User,
  Calendar,
  ChevronRight,
  MoreHorizontal,
  Filter,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  HoverCard,
  PulseBadge,
  InteractiveButton,
  StaggeredList,
  Toast,
  AnimatedSwitch,
} from "@/components/ui/micro-interactions"

interface Medication {
  id: string
  name: string
  genericName: string
  dosage: string
  route: string
  frequency: string
  instructions?: string
}

interface MARRecord {
  id: string
  medication: Medication
  scheduledTime: Date
  status: "due" | "administered" | "late" | "prn"
  administeredBy?: string
  administeredAt?: Date
  notes?: string
  isPrn: boolean
}

interface MARViewerProps {
  patientId: string
  patientName: string
  records: MARRecord[]
  onAdminister: (recordId: string, notes?: string) => void
}

const statusConfig = {
  due: {
    label: "Due",
    bgColor: "bg-info/10",
    textColor: "text-info",
    borderColor: "border-info/20",
    icon: Clock,
  },
  administered: {
    label: "Administered",
    bgColor: "bg-success/10",
    textColor: "text-success",
    borderColor: "border-success/20",
    icon: Check,
  },
  late: {
    label: "Late",
    bgColor: "bg-warning/10",
    textColor: "text-warning",
    borderColor: "border-warning/20",
    icon: AlertCircle,
  },
  prn: {
    label: "PRN",
    bgColor: "bg-gray-100",
    textColor: "text-gray-600",
    borderColor: "border-gray-200",
    icon: Pill,
  },
}

function MedicationCard({
  record,
  onAdminister,
  index,
}: {
  record: MARRecord
  onAdminister: () => void
  index: number
}) {
  const shouldReduceMotion = useReducedMotion()
  const status = statusConfig[record.status]
  const StatusIcon = status.icon
  const isOverdue = record.status === "late" ||
    (record.status === "due" && new Date() > new Date(record.scheduledTime.getTime() + 30 * 60000))

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
        <div
          className={cn(
            "p-4 border-l-4 rounded-lg",
            status.borderColor,
            status.bgColor
          )}
          style={{ padding: "var(--space-4)" }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  status.bgColor.replace("/10", "/20")
                )}
              >
                <Pill className={cn("w-5 h-5", status.textColor)} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{record.medication.name}</h4>
                  {record.isPrn && (
                    <Badge variant="outline" className="text-xs">
                      PRN
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {record.medication.genericName}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                  <Badge variant="outline" className={cn("font-medium", status.bgColor, status.textColor, status.borderColor)}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                  <span className="text-muted-foreground">
                    {record.scheduledTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {record.medication.dosage}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {record.medication.route}
                  </span>
                </div>
                {record.medication.instructions && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {record.medication.instructions}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {isOverdue && record.status !== "administered" && (
                <PulseBadge count={1}>
                  <div className="w-2 h-2" />
                </PulseBadge>
              )}
              {record.status === "administered" ? (
                <div className="text-right text-sm">
                  <div className="flex items-center gap-1 text-success">
                    <Check className="w-4 h-4" />
                    <span className="font-medium">Given</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {record.administeredAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {record.administeredBy && (
                    <p className="text-xs text-muted-foreground">
                      by {record.administeredBy}
                    </p>
                  )}
                </div>
              ) : (
                <InteractiveButton
                  size="sm"
                  onClick={onAdminister}
                  className={cn(
                    isOverdue && "animate-pulse"
                  )}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Administer
                </InteractiveButton>
              )}
            </div>
          </div>

          {record.notes && (
            <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
              <span className="font-medium">Notes:</span> {record.notes}
            </div>
          )}
        </div>
      </HoverCard>
    </motion.div>
  )
}

export function MARViewer({
  patientId,
  patientName,
  records,
  onAdminister,
}: MARViewerProps) {
  const [selectedRecord, setSelectedRecord] = useState<MARRecord | null>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const [showToast, setShowToast] = useState(false)
  const [filter, setFilter] = useState<"all" | "due" | "administered" | "late">("all")
  const shouldReduceMotion = useReducedMotion()

  const filteredRecords = records.filter((record) => {
    if (filter === "all") return true
    return record.status === filter
  })

  // Group records by time slot
  const timeSlots = ["06:00", "08:00", "12:00", "14:00", "18:00", "20:00", "22:00"]

  const handleAdminister = () => {
    if (selectedRecord) {
      onAdminister(selectedRecord.id, adminNotes)
      setSelectedRecord(null)
      setAdminNotes("")
      setShowToast(true)
    }
  }

  const pendingCount = records.filter((r) => r.status === "due" || r.status === "late").length
  const administeredCount = records.filter((r) => r.status === "administered").length

  return (
    <div className="space-y-6" style={{ gap: "var(--space-6)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Medication Administration Record</h2>
          <p className="text-muted-foreground">{patientName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-info/10 text-info border-info/20">
            {pendingCount} Pending
          </Badge>
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            {administeredCount} Given
          </Badge>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          variant={filter === "due" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("due")}
          className={filter === "due" ? "bg-info hover:bg-info/90" : ""}
        >
          Due
        </Button>
        <Button
          variant={filter === "late" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("late")}
          className={filter === "late" ? "bg-warning hover:bg-warning/90" : ""}
        >
          Late
        </Button>
        <Button
          variant={filter === "administered" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("administered")}
          className={filter === "administered" ? "bg-success hover:bg-success/90" : ""}
        >
          Administered
        </Button>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-6" style={{ gap: "var(--space-6)" }}>
          {filteredRecords.length > 0 ? (
            <StaggeredList staggerDelay={0.05}>
              {filteredRecords.map((record, index) => (
                <MedicationCard
                  key={record.id}
                  record={record}
                  onAdminister={() => setSelectedRecord(record)}
                  index={index}
                />
              ))}
            </StaggeredList>
          ) : (
            <div
              className="text-center py-12 text-muted-foreground"
              style={{ padding: "var(--space-12)" }}
            >
              <Pill className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No medications scheduled</p>
            </div>
          )}
        </div>
      </div>

      {/* Administer Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Administer Medication</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="py-4">
              <div className="bg-muted rounded-lg p-4 mb-4" style={{ padding: "var(--space-4)" }}>
                <h4 className="font-semibold">{selectedRecord.medication.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedRecord.medication.dosage} • {selectedRecord.medication.route}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Scheduled: {selectedRecord.scheduledTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Administration Notes (Optional)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg min-h-[100px]"
                  placeholder="Enter any notes about the administration..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRecord(null)}>
              Cancel
            </Button>
            <InteractiveButton onClick={handleAdminister}>
              <Check className="w-4 h-4 mr-2" />
              Confirm Administration
            </InteractiveButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast
            title="Medication Administered"
            description="The medication has been recorded as administered."
            variant="success"
            onClose={() => setShowToast(false)}
          />
        </div>
      )}
    </div>
  )
}
