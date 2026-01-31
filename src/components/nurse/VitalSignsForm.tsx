import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  Thermometer,
  Heart,
  Wind,
  Droplets,
  Activity,
  TrendingUp,
  AlertCircle,
  Check,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AnimatedInput,
  InteractiveButton,
  HoverCard,
  Toast,
} from "@/components/ui/micro-interactions"

type VitalType = "temperature" | "bp" | "pulse" | "respiration" | "spo2"

interface VitalInputProps {
  type: VitalType
  value: number | string
  unit: string
  normalRange: { min: number; max: number }
  onChange: (value: number | string) => void
  label: string
  icon: React.ElementType
}

interface VitalSignsData {
  temperature: number
  systolic: number
  diastolic: number
  pulse: number
  respiration: number
  spo2: number
}

const vitalConfigs: Record<VitalType, { label: string; unit: string; icon: React.ElementType; normalRange: { min: number; max: number } }> = {
  temperature: {
    label: "Temperature",
    unit: "°C",
    icon: Thermometer,
    normalRange: { min: 36.1, max: 37.2 },
  },
  bp: {
    label: "Blood Pressure",
    unit: "mmHg",
    icon: Heart,
    normalRange: { min: 90, max: 120 }, // systolic
  },
  pulse: {
    label: "Heart Rate",
    unit: "bpm",
    icon: Activity,
    normalRange: { min: 60, max: 100 },
  },
  respiration: {
    label: "Respiratory Rate",
    unit: "/min",
    icon: Wind,
    normalRange: { min: 12, max: 20 },
  },
  spo2: {
    label: "O₂ Saturation",
    unit: "%",
    icon: Droplets,
    normalRange: { min: 95, max: 100 },
  },
}

function getVitalStatus(
  value: number,
  normalRange: { min: number; max: number }
): "normal" | "warning" | "critical" {
  const range = normalRange.max - normalRange.min
  const criticalMargin = range * 0.3

  if (value < normalRange.min - criticalMargin || value > normalRange.max + criticalMargin) {
    return "critical"
  }
  if (value < normalRange.min || value > normalRange.max) {
    return "warning"
  }
  return "normal"
}

function VitalInputCard({
  type,
  value,
  unit,
  normalRange,
  onChange,
  label,
  icon: Icon,
}: VitalInputProps) {
  const [localValue, setLocalValue] = useState(value.toString())
  const shouldReduceMotion = useReducedMotion()

  const numericValue = parseFloat(localValue)
  const status = !isNaN(numericValue) ? getVitalStatus(numericValue, normalRange) : "normal"

  const statusColors = {
    normal: {
      border: "border-success",
      bg: "bg-success/5",
      text: "text-success",
      icon: "text-success",
    },
    warning: {
      border: "border-warning",
      bg: "bg-warning/5",
      text: "text-warning",
      icon: "text-warning",
    },
    critical: {
      border: "border-destructive",
      bg: "bg-destructive/5",
      text: "text-destructive",
      icon: "text-destructive",
    },
  }

  const colors = statusColors[status]

  useEffect(() => {
    setLocalValue(value.toString())
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    const numValue = parseFloat(newValue)
    if (!isNaN(numValue)) {
      onChange(numValue)
    }
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border-2 p-4 transition-colors",
        colors.border,
        colors.bg
      )}
      style={{ padding: "var(--space-4)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-lg bg-background", colors.icon)}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <label className="font-medium">{label}</label>
            <p className="text-xs text-muted-foreground">
              Normal: {normalRange.min}-{normalRange.max} {unit}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            status === "normal" && "bg-success/10 text-success border-success/20",
            status === "warning" && "bg-warning/10 text-warning border-warning/20",
            status === "critical" && "bg-destructive/10 text-destructive border-destructive/20"
          )}
        >
          {status === "normal" && <Check className="w-3 h-3 mr-1" />}
          {status === "warning" && <AlertCircle className="w-3 h-3 mr-1" />}
          {status === "critical" && <AlertCircle className="w-3 h-3 mr-1" />}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          step={type === "temperature" ? "0.1" : "1"}
          value={localValue}
          onChange={handleChange}
          className={cn(
            "flex-1 h-12 px-4 text-2xl font-bold text-center rounded-lg border bg-background focus:outline-none focus:ring-2",
            status === "normal" && "border-success focus:ring-success/20",
            status === "warning" && "border-warning focus:ring-warning/20",
            status === "critical" && "border-destructive focus:ring-destructive/20 animate-pulse"
          )}
          placeholder="--"
          aria-label={`${label} value`}
        />
        <span className="text-lg text-muted-foreground w-16">{unit}</span>
      </div>

      {/* Trend sparkline placeholder */}
      <div className="mt-3 h-8 flex items-end gap-1">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-t",
              status === "normal" && "bg-success/20",
              status === "warning" && "bg-warning/20",
              status === "critical" && "bg-destructive/20"
            )}
            style={{
              height: `${Math.random() * 60 + 20}%`,
            }}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-center">
        Last 24 hours trend
      </p>
    </motion.div>
  )
}

interface VitalSignsFormProps {
  patientId: string
  patientName: string
  onSave: (data: VitalSignsData) => void
  initialData?: Partial<VitalSignsData>
}

export function VitalSignsForm({
  patientId,
  patientName,
  onSave,
  initialData,
}: VitalSignsFormProps) {
  const [vitals, setVitals] = useState<VitalSignsData>({
    temperature: initialData?.temperature || 0,
    systolic: initialData?.systolic || 0,
    diastolic: initialData?.diastolic || 0,
    pulse: initialData?.pulse || 0,
    respiration: initialData?.respiration || 0,
    spo2: initialData?.spo2 || 0,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    onSave(vitals)
    setIsSaving(false)
    setShowToast(true)
  }

  const hasCriticalValues = Object.entries(vitals).some(([key, value]) => {
    if (key === "systolic") {
      return getVitalStatus(value, vitalConfigs.bp.normalRange) === "critical"
    }
    if (key === "diastolic") {
      return getVitalStatus(value, { min: 60, max: 80 }) === "critical"
    }
    const config = vitalConfigs[key as VitalType]
    if (config) {
      return getVitalStatus(value, config.normalRange) === "critical"
    }
    return false
  })

  return (
    <div className="space-y-6" style={{ gap: "var(--space-6)" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Vital Signs Entry</h2>
          <p className="text-muted-foreground">{patientName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleString()}
          </span>
        </div>
      </div>

      {/* Critical Alert */}
      {hasCriticalValues && (
        <motion.div
          initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Critical Values Detected</p>
            <p className="text-sm text-destructive/80">
              One or more vital signs are outside the critical range. Please review immediately.
            </p>
          </div>
        </motion.div>
      )}

      {/* Vital Signs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ gap: "var(--space-4)" }}>
        <VitalInputCard
          type="temperature"
          value={vitals.temperature}
          unit="°C"
          normalRange={vitalConfigs.temperature.normalRange}
          onChange={(value) => setVitals({ ...vitals, temperature: value as number })}
          label="Temperature"
          icon={Thermometer}
        />

        <HoverCard>
          <div
            className="rounded-lg border-2 border-success bg-success/5 p-4"
            style={{ padding: "var(--space-4)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-background text-success">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <label className="font-medium">Blood Pressure</label>
                  <p className="text-xs text-muted-foreground">
                    Normal: 90-120/60-80 mmHg
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Systolic</label>
                <input
                  type="number"
                  value={vitals.systolic || ""}
                  onChange={(e) =>
                    setVitals({ ...vitals, systolic: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full h-12 px-3 text-xl font-bold text-center rounded-lg border border-success focus:outline-none focus:ring-2 focus:ring-success/20"
                  placeholder="--"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Diastolic</label>
                <input
                  type="number"
                  value={vitals.diastolic || ""}
                  onChange={(e) =>
                    setVitals({ ...vitals, diastolic: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full h-12 px-3 text-xl font-bold text-center rounded-lg border border-success focus:outline-none focus:ring-2 focus:ring-success/20"
                  placeholder="--"
                />
              </div>
            </div>
          </div>
        </HoverCard>

        <VitalInputCard
          type="pulse"
          value={vitals.pulse}
          unit="bpm"
          normalRange={vitalConfigs.pulse.normalRange}
          onChange={(value) => setVitals({ ...vitals, pulse: value as number })}
          label="Heart Rate"
          icon={Activity}
        />

        <VitalInputCard
          type="respiration"
          value={vitals.respiration}
          unit="/min"
          normalRange={vitalConfigs.respiration.normalRange}
          onChange={(value) => setVitals({ ...vitals, respiration: value as number })}
          label="Respiratory Rate"
          icon={Wind}
        />

        <VitalInputCard
          type="spo2"
          value={vitals.spo2}
          unit="%"
          normalRange={vitalConfigs.spo2.normalRange}
          onChange={(value) => setVitals({ ...vitals, spo2: value as number })}
          label="O₂ Saturation"
          icon={Droplets}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => setVitals({
          temperature: 0,
          systolic: 0,
          diastolic: 0,
          pulse: 0,
          respiration: 0,
          spo2: 0,
        })}>
          Cancel
        </Button>
        <InteractiveButton
          onClick={handleSave}
          isLoading={isSaving}
          className="gap-2"
        >
          <Check className="w-4 h-4" />
          Save Vitals
        </InteractiveButton>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast
            title="Vitals Saved"
            description="Vital signs have been recorded successfully."
            variant="success"
            onClose={() => setShowToast(false)}
          />
        </div>
      )}
    </div>
  )
}
