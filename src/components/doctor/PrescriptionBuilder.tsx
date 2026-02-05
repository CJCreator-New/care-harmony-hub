import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, useReducedMotion, AnimatePresence } from "framer-motion"
import {
  Search,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  Check,
  ChevronDown,
  Pill,
  Clock,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AnimatedInput,
  InteractiveButton,
  HoverCard,
  StaggeredList,
  Toast,
} from "@/components/ui/micro-interactions"

interface Drug {
  id: string
  name: string
  genericName: string
  dosageForms: string[]
  strengths: string[]
  interactions?: DrugInteraction[]
}

interface DrugInteraction {
  severity: "contraindicated" | "major" | "moderate" | "minor"
  drug: string
  description: string
}

interface PrescriptionItem {
  id: string
  drug: Drug
  dosage: string
  frequency: string
  duration: string
  instructions: string
  quantity: number
}

interface Prescription {
  id: string
  patientId: string
  items: PrescriptionItem[]
  createdAt: Date
  status: "draft" | "pending" | "approved" | "dispensed"
}

interface PrescriptionBuilderProps {
  patientId: string
  onSave: (prescription: Prescription) => void
  existingDrugs?: Drug[]
}

const frequencies = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
  "Every 4 hours",
  "Every 6 hours",
  "Every 8 hours",
  "Every 12 hours",
  "As needed",
  "Before meals",
  "After meals",
]

const durations = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "1 month",
  "2 months",
  "3 months",
  "Ongoing",
]

function DrugSearch({
  onSelect,
  existingDrugs = [],
}: {
  onSelect: (drug: Drug) => void
  existingDrugs?: Drug[]
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showResults, setShowResults] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  // Mock drug database - in real app, this would come from an API
  const mockDrugs: Drug[] = [
    {
      id: "1",
      name: "Lisinopril",
      genericName: "Lisinopril",
      dosageForms: ["Tablet"],
      strengths: ["5mg", "10mg", "20mg"],
    },
    {
      id: "2",
      name: "Metformin",
      genericName: "Metformin HCl",
      dosageForms: ["Tablet"],
      strengths: ["500mg", "850mg", "1000mg"],
    },
    {
      id: "3",
      name: "Atorvastatin",
      genericName: "Atorvastatin Calcium",
      dosageForms: ["Tablet"],
      strengths: ["10mg", "20mg", "40mg", "80mg"],
    },
    {
      id: "4",
      name: "Amlodipine",
      genericName: "Amlodipine Besylate",
      dosageForms: ["Tablet"],
      strengths: ["2.5mg", "5mg", "10mg"],
    },
    {
      id: "5",
      name: "Omeprazole",
      genericName: "Omeprazole",
      dosageForms: ["Capsule", "Tablet"],
      strengths: ["20mg", "40mg"],
    },
  ]

  const filteredDrugs = mockDrugs.filter(
    (drug) =>
      drug.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drug.genericName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <AnimatedInput
          placeholder="Search medications..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setShowResults(e.target.value.length > 0)
          }}
          onFocus={() => searchQuery.length > 0 && setShowResults(true)}
          className="pl-10"
        />
      </div>

      <AnimatePresence>
        {showResults && searchQuery.length > 0 && (
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {filteredDrugs.length > 0 ? (
              filteredDrugs.map((drug) => (
                <button
                  key={drug.id}
                  className="w-full px-4 py-3 text-left hover:bg-accent transition-colors border-b last:border-0"
                  onClick={() => {
                    onSelect(drug)
                    setSearchQuery("")
                    setShowResults(false)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-doctor" />
                    <span className="font-medium">{drug.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">
                    {drug.genericName} • {drug.dosageForms.join(", ")}
                  </p>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-muted-foreground">
                No medications found
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DrugInteractionAlert({
  interactions,
}: {
  interactions: DrugInteraction[]
}) {
  const severityColors = {
    contraindicated: "bg-destructive/10 text-destructive border-destructive/20",
    major: "bg-warning/10 text-warning border-warning/20",
    moderate: "bg-info/10 text-info border-info/20",
    minor: "bg-gray-100 text-gray-600 border-gray-200",
  }

  return (
    <div className="space-y-2">
      {interactions.map((interaction) => (
        <div
          key={`${interaction.drug}-${interaction.severity}`}
          className={cn(
            "p-3 rounded-lg border text-sm",
            severityColors[interaction.severity]
          )}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">
                {interaction.severity.charAt(0).toUpperCase() +
                  interaction.severity.slice(1)}{" "}
                Interaction
              </p>
              <p className="opacity-90">{interaction.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PrescriptionItemCard({
  item,
  onUpdate,
  onRemove,
  index,
}: {
  item: PrescriptionItem
  onUpdate: (item: PrescriptionItem) => void
  onRemove: () => void
  index: number
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? {} : { opacity: 0, x: -100 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3,
        delay: shouldReduceMotion ? 0 : index * 0.05,
      }}
    >
      <HoverCard>
        <div className="p-4" style={{ padding: "var(--space-4)" }}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-doctor/10 flex items-center justify-center">
                <Pill className="w-5 h-5 text-doctor" />
              </div>
              <div>
                <h4 className="font-semibold">{item.drug.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {item.drug.genericName}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-destructive hover:text-destructive"
              aria-label="Remove medication"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4" style={{ gap: "var(--space-4)" }}>
            <div>
              <label className="text-sm font-medium mb-1 block">Dosage</label>
              <Select
                value={item.dosage}
                onValueChange={(value) =>
                  onUpdate({ ...item, dosage: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dosage" />
                </SelectTrigger>
                <SelectContent>
                  {item.drug.strengths.map((strength) => (
                    <SelectItem key={strength} value={strength}>
                      {strength}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Frequency</label>
              <Select
                value={item.frequency}
                onValueChange={(value) =>
                  onUpdate({ ...item, frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {frequencies.map((freq) => (
                    <SelectItem key={freq} value={freq}>
                      {freq}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Duration</label>
              <Select
                value={item.duration}
                onValueChange={(value) =>
                  onUpdate({ ...item, duration: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durations.map((dur) => (
                    <SelectItem key={dur} value={dur}>
                      {dur}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Quantity</label>
              <div className="flex items-center gap-2">
                <InteractiveButton
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onUpdate({ ...item, quantity: Math.max(1, item.quantity - 1) })
                  }
                >
                  <Minus className="w-4 h-4" />
                </InteractiveButton>
                <span className="w-12 text-center font-medium">{item.quantity}</span>
                <InteractiveButton
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdate({ ...item, quantity: item.quantity + 1 })}
                >
                  <Plus className="w-4 h-4" />
                </InteractiveButton>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium mb-1 block">Instructions</label>
            <AnimatedInput
              placeholder="e.g., Take with food"
              value={item.instructions}
              onChange={(e) =>
                onUpdate({ ...item, instructions: e.target.value })
              }
            />
          </div>
        </div>
      </HoverCard>
    </motion.div>
  )
}

export function PrescriptionBuilder({
  patientId,
  onSave,
  existingDrugs = [],
}: PrescriptionBuilderProps) {
  const [items, setItems] = useState<PrescriptionItem[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  const addDrug = (drug: Drug) => {
    const newItem: PrescriptionItem = {
      id: `item-${Date.now()}`,
      drug,
      dosage: drug.strengths[0] || "",
      frequency: "Once daily",
      duration: "7 days",
      instructions: "",
      quantity: 1,
    }
    setItems([...items, newItem])
  }

  const updateItem = (updatedItem: PrescriptionItem) => {
    setItems(items.map((item) => (item.id === updatedItem.id ? updatedItem : item)))
  }

  const removeItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId))
  }

  const handleSave = () => {
    const prescription: Prescription = {
      id: `rx-${Date.now()}`,
      patientId,
      items,
      createdAt: new Date(),
      status: "pending",
    }
    onSave(prescription)
    setShowConfirmDialog(false)
    setShowToast(true)
    setItems([])
  }

  return (
    <div className="space-y-6" style={{ gap: "var(--space-6)" }}>
      {/* Drug Search */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Add Medications</h3>
        <DrugSearch onSelect={addDrug} existingDrugs={existingDrugs} />
      </div>

      {/* Prescription Items */}
      <AnimatePresence mode="popLayout">
        {items.length > 0 ? (
          <div className="space-y-4" style={{ gap: "var(--space-4)" }}>
            {items.map((item, index) => (
              <PrescriptionItemCard
                key={item.id}
                item={item}
                onUpdate={updateItem}
                onRemove={() => removeItem(item.id)}
                index={index}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg"
            style={{ padding: "var(--space-12)" }}
          >
            <Pill className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No medications added yet</p>
            <p className="text-sm">Search and select medications above</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary */}
      {items.length > 0 && (
        <HoverCard>
          <div className="p-4" style={{ padding: "var(--space-4)" }}>
            <h4 className="font-semibold mb-3">Prescription Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Medications</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Quantity</span>
                <span className="font-medium">
                  {items.reduce((sum, item) => sum + item.quantity, 0)} items
                </span>
              </div>
            </div>
            <InteractiveButton
              className="w-full mt-4"
              onClick={() => setShowConfirmDialog(true)}
            >
              <Check className="w-4 h-4 mr-2" />
              Save Prescription
            </InteractiveButton>
          </div>
        </HoverCard>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Prescription</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-4">
              You are about to prescribe {items.length} medication(s). Please review
              before confirming.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-muted rounded-lg text-sm"
                >
                  <p className="font-medium">{item.drug.name}</p>
                  <p className="text-muted-foreground">
                    {item.dosage} • {item.frequency} • {item.duration}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <InteractiveButton onClick={handleSave}>
              Confirm & Save
            </InteractiveButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast
            title="Prescription Saved"
            description="The prescription has been successfully created."
            variant="success"
            onClose={() => setShowToast(false)}
          />
        </div>
      )}
    </div>
  )
}
