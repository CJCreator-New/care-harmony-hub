import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  X,
  Phone,
  Pill,
  Check,
  ChevronRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  HoverCard,
  InteractiveButton,
  StaggeredList,
} from "@/components/ui/micro-interactions"

interface DrugInteraction {
  id: string
  severity: "contraindicated" | "major" | "moderate" | "minor"
  drug1: string
  drug2: string
  description: string
  recommendation: string
  mechanism?: string
  management?: string
}

interface InteractionAlertProps {
  interaction: DrugInteraction
  onContactPrescriber?: () => void
  onSuggestAlternative?: () => void
  index: number
}

const severityConfig = {
  contraindicated: {
    icon: AlertOctagon,
    title: "Contraindicated",
    alertClass: "border-destructive bg-destructive/10",
    iconClass: "text-destructive",
    badgeClass: "bg-destructive text-destructive-foreground",
  },
  major: {
    icon: AlertTriangle,
    title: "Major Interaction",
    alertClass: "border-warning bg-warning/10",
    iconClass: "text-warning",
    badgeClass: "bg-warning text-warning-foreground",
  },
  moderate: {
    icon: Info,
    title: "Moderate Interaction",
    alertClass: "border-info bg-info/10",
    iconClass: "text-info",
    badgeClass: "bg-info text-info-foreground",
  },
  minor: {
    icon: Info,
    title: "Minor Interaction",
    alertClass: "border-gray-300 bg-gray-50",
    iconClass: "text-gray-500",
    badgeClass: "bg-gray-200 text-gray-700",
  },
}

function InteractionAlert({
  interaction,
  onContactPrescriber,
  onSuggestAlternative,
  index,
}: InteractionAlertProps) {
  const shouldReduceMotion = useReducedMotion()
  const config = severityConfig[interaction.severity]
  const Icon = config.icon

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3,
        delay: shouldReduceMotion ? 0 : index * 0.1,
      }}
    >
      <Alert className={cn("border-l-4", config.alertClass)}>
        <div className="flex items-start gap-3">
          <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", config.iconClass)} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <AlertTitle className="flex items-center gap-2">
                {config.title}
                <Badge className={config.badgeClass}>
                  {interaction.severity.toUpperCase()}
                </Badge>
              </AlertTitle>
            </div>

            <AlertDescription className="space-y-3">
              <div>
                <p className="font-medium">
                  {interaction.drug1} + {interaction.drug2}
                </p>
                <p className="mt-1">{interaction.description}</p>
              </div>

              <div className="bg-background/50 rounded p-3">
                <p className="font-medium text-sm">Recommendation:</p>
                <p className="text-sm mt-1">{interaction.recommendation}</p>
              </div>

              {interaction.mechanism && (
                <div>
                  <p className="font-medium text-sm">Mechanism:</p>
                  <p className="text-sm text-muted-foreground">
                    {interaction.mechanism}
                  </p>
                </div>
              )}

              {interaction.management && (
                <div>
                  <p className="font-medium text-sm">Management:</p>
                  <p className="text-sm text-muted-foreground">
                    {interaction.management}
                  </p>
                </div>
              )}

              {(interaction.severity === "contraindicated" ||
                interaction.severity === "major") && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <InteractiveButton
                    variant="outline"
                    size="sm"
                    onClick={onContactPrescriber}
                    className="gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    Contact Prescriber
                  </InteractiveButton>
                  <InteractiveButton
                    variant="outline"
                    size="sm"
                    onClick={onSuggestAlternative}
                    className="gap-2"
                  >
                    <Pill className="w-4 h-4" />
                    Suggest Alternative
                  </InteractiveButton>
                </div>
              )}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </motion.div>
  )
}

interface InteractionCheckerProps {
  currentDrugs: string[]
  newDrug?: string
  onCheck: (drug1: string, drug2: string) => DrugInteraction[]
  className?: string
}

export function InteractionChecker({
  currentDrugs,
  newDrug,
  onCheck,
  className,
}: InteractionCheckerProps) {
  const [interactions, setInteractions] = useState<DrugInteraction[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  const handleCheck = async () => {
    if (!newDrug || currentDrugs.length === 0) return

    setIsChecking(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))

    const mockInteractions: DrugInteraction[] = [
      {
        id: "1",
        severity: "major",
        drug1: currentDrugs[0],
        drug2: newDrug,
        description: `Concurrent use may increase the risk of bleeding.`,
        recommendation: "Monitor closely for signs of bleeding. Consider alternative therapy.",
        mechanism: "Additive pharmacodynamic effects on platelet function.",
        management: "Monitor INR/PT more frequently. Patient education on bleeding signs.",
      },
    ]

    setInteractions(mockInteractions)
    setIsChecking(false)
  }

  const contraindicatedCount = interactions.filter(
    (i) => i.severity === "contraindicated"
  ).length
  const majorCount = interactions.filter((i) => i.severity === "major").length
  const moderateCount = interactions.filter((i) => i.severity === "moderate").length
  const minorCount = interactions.filter((i) => i.severity === "minor").length

  return (
    <div className={cn("space-y-4", className)} style={{ gap: "var(--space-4)" }}>
      {/* Summary */}
      {interactions.length > 0 && (
        <HoverCard>
          <div className="p-4" style={{ padding: "var(--space-4)" }}>
            <h3 className="font-semibold mb-3">Interaction Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {contraindicatedCount > 0 && (
                <div className="bg-destructive/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">
                    {contraindicatedCount}
                  </p>
                  <p className="text-xs text-destructive/80">Contraindicated</p>
                </div>
              )}
              {majorCount > 0 && (
                <div className="bg-warning/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-warning">{majorCount}</p>
                  <p className="text-xs text-warning/80">Major</p>
                </div>
              )}
              {moderateCount > 0 && (
                <div className="bg-info/10 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-info">{moderateCount}</p>
                  <p className="text-xs text-info/80">Moderate</p>
                </div>
              )}
              {minorCount > 0 && (
                <div className="bg-gray-100 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-600">{minorCount}</p>
                  <p className="text-xs text-gray-500">Minor</p>
                </div>
              )}
            </div>
          </div>
        </HoverCard>
      )}

      {/* Current Medications */}
      <div>
        <h4 className="text-sm font-medium mb-2">Current Medications</h4>
        <div className="flex flex-wrap gap-2">
          {currentDrugs.map((drug) => (
            <Badge key={drug} variant="secondary" className="px-3 py-1">
              <Pill className="w-3 h-3 mr-1" />
              {drug}
            </Badge>
          ))}
        </div>
      </div>

      {/* Check Button */}
      {newDrug && (
        <InteractiveButton
          onClick={handleCheck}
          isLoading={isChecking}
          className="w-full"
        >
          <Check className="w-4 h-4 mr-2" />
          Check Interactions with {newDrug}
        </InteractiveButton>
      )}

      {/* Interactions List */}
      {interactions.length > 0 ? (
        <div className="space-y-3" style={{ gap: "var(--space-3)" }}>
          <h4 className="font-semibold">Detected Interactions</h4>
          <StaggeredList staggerDelay={0.1}>
            {interactions.map((interaction, index) => (
              <InteractionAlert
                key={interaction.id}
                interaction={interaction}
                index={index}
              />
            ))}
          </StaggeredList>
        </div>
      ) : (
        isChecking === false &&
        newDrug && (
          <div className="text-center py-8 text-muted-foreground">
            <Check className="w-12 h-12 mx-auto mb-3 text-success" />
            <p>No interactions detected</p>
            <p className="text-sm">The selected medications appear safe to use together</p>
          </div>
        )
      )}
    </div>
  )
}
