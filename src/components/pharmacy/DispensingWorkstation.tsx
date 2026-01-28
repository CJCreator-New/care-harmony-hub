import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, useReducedMotion, AnimatePresence } from "framer-motion"
import {
  Check,
  Printer,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Package,
  FileText,
  User,
  Pill,
  QrCode,
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
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AnimatedSwitch,
  InteractiveButton,
  HoverCard,
  Toast,
} from "@/components/ui/micro-interactions"

interface PrescriptionItem {
  id: string
  drugName: string
  dosage: string
  quantity: number
  instructions: string
}

interface Prescription {
  id: string
  patientName: string
  patientId: string
  prescriber: string
  items: PrescriptionItem[]
  status: "pending" | "verified" | "preparing" | "ready"
}

interface DispensingWorkstationProps {
  prescription: Prescription
  onVerify: () => void
  onPrint: () => void
}

type Step = "verify" | "prepare" | "label" | "final"

const steps: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: "verify", label: "Verify Prescription", icon: FileText },
  { id: "prepare", label: "Prepare Medication", icon: Package },
  { id: "label", label: "Print Label", icon: Printer },
  { id: "final", label: "Final Check", icon: Check },
]

function StepIndicator({
  currentStep,
  completedSteps,
}: {
  currentStep: Step
  completedSteps: Step[]
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id)
        const isCurrent = currentStep === step.id
        const Icon = step.icon

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  isCompleted && "bg-pharmacy text-white",
                  isCurrent && "bg-pharmacy/20 text-pharmacy border-2 border-pharmacy",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs mt-2 text-center w-20",
                  isCurrent && "font-medium text-pharmacy",
                  isCompleted && "text-pharmacy"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2",
                  isCompleted ? "bg-pharmacy" : "bg-muted"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function LabelPreview({ item }: { item: PrescriptionItem }) {
  return (
    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 max-w-xs mx-auto">
      <div className="text-center border-b pb-2 mb-2">
        <p className="font-bold text-sm">AROCORD PHARMACY</p>
        <p className="text-xs text-gray-500">Healthcare Management System</p>
      </div>
      <div className="space-y-1 text-xs">
        <p className="font-bold">{item.drugName}</p>
        <p>{item.dosage}</p>
        <p>Qty: {item.quantity}</p>
        <p className="text-gray-600 mt-2">{item.instructions}</p>
        <div className="border-t pt-2 mt-2">
          <p>Rx #: RX-{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
          <p>Date: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <QrCode className="w-16 h-16 text-gray-400" />
      </div>
    </div>
  )
}

export function DispensingWorkstation({
  prescription,
  onVerify,
  onPrint,
}: DispensingWorkstationProps) {
  const [currentStep, setCurrentStep] = useState<Step>("verify")
  const [completedSteps, setCompletedSteps] = useState<Step[]>([])
  const [verificationChecks, setVerificationChecks] = useState({
    patientVerified: false,
    drugsVerified: false,
    dosageVerified: false,
    interactionsChecked: false,
  })
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  const allVerified = Object.values(verificationChecks).every(Boolean)

  const handleNext = () => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep)
    if (currentIndex < steps.length - 1) {
      setCompletedSteps([...completedSteps, currentStep])
      setCurrentStep(steps[currentIndex + 1].id)
    }
  }

  const handleBack = () => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id)
      setCompletedSteps(completedSteps.filter((s) => s !== steps[currentIndex - 1].id))
    }
  }

  const handleComplete = () => {
    setShowConfirmDialog(true)
  }

  const confirmComplete = () => {
    onVerify()
    setShowConfirmDialog(false)
    setShowToast(true)
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case "verify":
        return (
          <div className="space-y-4" style={{ gap: "var(--space-4)" }}>
            <h3 className="font-semibold">Verify Prescription Details</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                <Checkbox
                  checked={verificationChecks.patientVerified}
                  onCheckedChange={(checked) =>
                    setVerificationChecks({
                      ...verificationChecks,
                      patientVerified: checked as boolean,
                    })
                  }
                />
                <div>
                  <p className="font-medium">Patient Identity Verified</p>
                  <p className="text-sm text-muted-foreground">
                    Confirm patient: {prescription.patientName}
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                <Checkbox
                  checked={verificationChecks.drugsVerified}
                  onCheckedChange={(checked) =>
                    setVerificationChecks({
                      ...verificationChecks,
                      drugsVerified: checked as boolean,
                    })
                  }
                />
                <div>
                  <p className="font-medium">Medications Verified</p>
                  <p className="text-sm text-muted-foreground">
                    All {prescription.items.length} medications checked
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                <Checkbox
                  checked={verificationChecks.dosageVerified}
                  onCheckedChange={(checked) =>
                    setVerificationChecks({
                      ...verificationChecks,
                      dosageVerified: checked as boolean,
                    })
                  }
                />
                <div>
                  <p className="font-medium">Dosages Verified</p>
                  <p className="text-sm text-muted-foreground">
                    All dosages and quantities confirmed
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                <Checkbox
                  checked={verificationChecks.interactionsChecked}
                  onCheckedChange={(checked) =>
                    setVerificationChecks({
                      ...verificationChecks,
                      interactionsChecked: checked as boolean,
                    })
                  }
                />
                <div>
                  <p className="font-medium">Drug Interactions Checked</p>
                  <p className="text-sm text-muted-foreground">
                    No contraindications found
                  </p>
                </div>
              </label>
            </div>
          </div>
        )

      case "prepare":
        return (
          <div className="space-y-4" style={{ gap: "var(--space-4)" }}>
            <h3 className="font-semibold">Prepare Medications</h3>
            <div className="space-y-3">
              {prescription.items.map((item) => (
                <HoverCard key={item.id}>
                  <div className="p-4" style={{ padding: "var(--space-4)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pharmacy/10 flex items-center justify-center">
                        <Pill className="w-5 h-5 text-pharmacy" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.drugName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.dosage} • Qty: {item.quantity}
                        </p>
                      </div>
                      <AnimatedSwitch
                        checked={false}
                        onCheckedChange={() => {}}
                      />
                    </div>
                  </div>
                </HoverCard>
              ))}
            </div>
          </div>
        )

      case "label":
        return (
          <div className="space-y-4" style={{ gap: "var(--space-4)" }}>
            <h3 className="font-semibold">Print Labels</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prescription.items.map((item) => (
                <div key={item.id}>
                  <p className="text-sm font-medium mb-2">{item.drugName}</p>
                  <LabelPreview item={item} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 gap-2"
                    onClick={onPrint}
                  >
                    <Printer className="w-4 h-4" />
                    Print Label
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )

      case "final":
        return (
          <div className="space-y-4" style={{ gap: "var(--space-4)" }}>
            <h3 className="font-semibold">Final Verification</h3>
            <div className="bg-pharmacy/5 border border-pharmacy/20 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-5 h-5 text-pharmacy" />
                <div>
                  <p className="font-medium">{prescription.patientName}</p>
                  <p className="text-sm text-muted-foreground">
                    Prescribed by {prescription.prescriber}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {prescription.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Check className="w-4 h-4 text-success" />
                    <span>
                      {item.drugName} - {item.dosage} (Qty: {item.quantity})
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-warning" />
              <p className="text-sm text-warning">
                Please double-check all medications before completing
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6" style={{ gap: "var(--space-6)" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dispensing Workstation</h2>
          <p className="text-muted-foreground">
            Rx #{prescription.id} • {prescription.patientName}
          </p>
        </div>
        <Badge
          variant="outline"
          className="bg-pharmacy/10 text-pharmacy border-pharmacy/20"
        >
          {prescription.items.length} items
        </Badge>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

      {/* Step Content */}
      <div className="bg-card border rounded-lg p-6" style={{ padding: "var(--space-6)" }}>
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === "verify"}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        {currentStep === "final" ? (
          <InteractiveButton onClick={handleComplete} className="gap-2">
            <Check className="w-4 h-4" />
            Complete Dispensing
          </InteractiveButton>
        ) : (
          <Button
            onClick={handleNext}
            disabled={currentStep === "verify" && !allVerified}
            className="gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Final Check</DialogTitle>
            <DialogDescription>
              Please confirm that you have verified all medications and labels before
              completing this prescription.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted rounded-lg p-4">
              <p className="font-medium">{prescription.patientName}</p>
              <p className="text-sm text-muted-foreground">
                {prescription.items.length} medications
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Review Again
            </Button>
            <InteractiveButton onClick={confirmComplete}>
              Confirm & Complete
            </InteractiveButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast
            title="Dispensing Complete"
            description="The prescription has been successfully dispensed."
            variant="success"
            onClose={() => setShowToast(false)}
          />
        </div>
      )}
    </div>
  )
}
