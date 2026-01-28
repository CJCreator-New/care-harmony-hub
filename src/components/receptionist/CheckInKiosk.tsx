import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, useReducedMotion, AnimatePresence } from "framer-motion"
import {
  Search,
  User,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  QrCode,
  Phone,
  AlertCircle,
  Printer,
  Home,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AnimatedInput,
  InteractiveButton,
  PageTransition,
  Toast,
} from "@/components/ui/micro-interactions"

interface Patient {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  phone: string
  photoUrl?: string
  mrn: string
}

interface CheckInKioskProps {
  onCheckIn: (patientId: string) => void
  onNewRegistration: () => void
}

type Step = "search" | "verify" | "confirm" | "complete"

export function CheckInKiosk({ onCheckIn, onNewRegistration }: CheckInKioskProps) {
  const [currentStep, setCurrentStep] = useState<Step>("search")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showToast, setShowToast] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  // Mock patient data
  const mockPatients: Patient[] = [
    {
      id: "1",
      firstName: "John",
      lastName: "Smith",
      dateOfBirth: new Date("1985-03-15"),
      phone: "(555) 123-4567",
      mrn: "MRN001234",
    },
    {
      id: "2",
      firstName: "Sarah",
      lastName: "Johnson",
      dateOfBirth: new Date("1990-07-22"),
      phone: "(555) 987-6543",
      mrn: "MRN005678",
    },
    {
      id: "3",
      firstName: "Michael",
      lastName: "Brown",
      dateOfBirth: new Date("1978-11-08"),
      phone: "(555) 456-7890",
      mrn: "MRN009012",
    },
  ]

  const filteredPatients = mockPatients.filter(
    (p) =>
      p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      p.mrn.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setCurrentStep("verify")
  }

  const handleConfirm = () => {
    setCurrentStep("complete")
    if (selectedPatient) {
      onCheckIn(selectedPatient.id)
    }
    setShowToast(true)
  }

  const handleBack = () => {
    const stepOrder: Step[] = ["search", "verify", "confirm", "complete"]
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1])
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case "search":
        return (
          <div className="space-y-6" style={{ gap: "var(--space-6)" }}>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-receptionist/10 flex items-center justify-center">
                <User className="w-10 h-10 text-receptionist" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Welcome</h2>
              <p className="text-lg text-muted-foreground">
                Please search for your appointment
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-4" style={{ gap: "var(--space-4)" }}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
                <Input
                  placeholder="Name, phone, or MRN"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-lg"
                />
              </div>

              {searchQuery.length > 0 && (
                <motion.div
                  initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => handleSelectPatient(patient)}
                        className="w-full p-4 text-left bg-muted rounded-lg hover:bg-accent transition-colors flex items-center gap-4"
                        style={{ padding: "var(--space-4)" }}
                      >
                        <div className="w-12 h-12 rounded-full bg-receptionist/10 flex items-center justify-center text-receptionist font-semibold">
                          {patient.firstName.charAt(0)}
                          {patient.lastName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-lg">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            DOB: {patient.dateOfBirth.toLocaleDateString()} •{" "}
                            {patient.mrn}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No patients found</p>
                    </div>
                  )}
                </motion.div>
              )}

              <div className="pt-4 border-t">
                <p className="text-center text-muted-foreground mb-4">
                  Don't have an appointment?
                </p>
                <Button
                  variant="outline"
                  className="w-full h-12 text-lg"
                  onClick={onNewRegistration}
                >
                  Register as New Patient
                </Button>
              </div>
            </div>
          </div>
        )

      case "verify":
        return (
          <div className="space-y-6" style={{ gap: "var(--space-6)" }}>
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">Verify Your Identity</h2>
              <p className="text-lg text-muted-foreground">
                Please confirm your information
              </p>
            </div>

            {selectedPatient && (
              <div className="max-w-md mx-auto">
                <div className="bg-muted rounded-lg p-6 text-center" style={{ padding: "var(--space-6)" }}>
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-receptionist/10 flex items-center justify-center text-receptionist text-3xl font-bold">
                    {selectedPatient.firstName.charAt(0)}
                    {selectedPatient.lastName.charAt(0)}
                  </div>
                  <h3 className="text-2xl font-bold mb-1">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {selectedPatient.mrn}
                  </p>

                  <div className="space-y-2 text-left">
                    <div className="flex items-center gap-3 p-3 bg-background rounded">
                      <Calendar className="w-5 h-5 text-receptionist" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">
                          {selectedPatient.dateOfBirth.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-background rounded">
                      <Phone className="w-5 h-5 text-receptionist" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedPatient.phone}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1 h-14 text-lg"
                    onClick={handleBack}
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <InteractiveButton
                    className="flex-1 h-14 text-lg"
                    onClick={() => setCurrentStep("confirm")}
                  >
                    This is Me
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </InteractiveButton>
                </div>

                <Button
                  variant="ghost"
                  className="w-full mt-4"
                  onClick={onNewRegistration}
                >
                  Not you? Register as new patient
                </Button>
              </div>
            )}
          </div>
        )

      case "confirm":
        return (
          <div className="space-y-6" style={{ gap: "var(--space-6)" }}>
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">Confirm Check-in</h2>
              <p className="text-lg text-muted-foreground">
                Review and confirm your appointment details
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-4" style={{ gap: "var(--space-4)" }}>
              <div className="bg-receptionist/5 border border-receptionist/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-receptionist/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-receptionist" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {selectedPatient?.firstName} {selectedPatient?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPatient?.mrn}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Appointment</span>
                    <span className="font-medium">Today at 2:30 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="font-medium">Dr. Sarah Johnson</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium">General Medicine</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-14 text-lg"
                  onClick={handleBack}
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <InteractiveButton
                  className="flex-1 h-14 text-lg"
                  onClick={handleConfirm}
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Confirm
                </InteractiveButton>
              </div>
            </div>
          </div>
        )

      case "complete":
        return (
          <div className="space-y-6 text-center" style={{ gap: "var(--space-6)" }}>
            <motion.div
              initial={shouldReduceMotion ? {} : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-32 h-32 mx-auto rounded-full bg-success/10 flex items-center justify-center"
            >
              <CheckCircle2 className="w-16 h-16 text-success" />
            </motion.div>

            <div>
              <h2 className="text-3xl font-bold mb-2">Check-in Complete!</h2>
              <p className="text-lg text-muted-foreground">
                Please take a seat and wait for your name to be called
              </p>
            </div>

            <div className="max-w-sm mx-auto bg-muted rounded-lg p-6" style={{ padding: "var(--space-6)" }}>
              <p className="text-sm text-muted-foreground mb-2">Your Queue Number</p>
              <p className="text-5xl font-bold text-receptionist">A-42</p>
              <p className="text-sm text-muted-foreground mt-2">
                Estimated wait time: 15 minutes
              </p>
            </div>

            <div className="flex gap-3 max-w-sm mx-auto">
              <Button
                variant="outline"
                className="flex-1 h-14 text-lg gap-2"
                onClick={() => window.print()}
              >
                <Printer className="w-5 h-5" />
                Print Pass
              </Button>
              <InteractiveButton
                className="flex-1 h-14 text-lg gap-2"
                onClick={() => {
                  setCurrentStep("search")
                  setSelectedPatient(null)
                  setSearchQuery("")
                }}
              >
                <Home className="w-5 h-5" />
                Done
              </InteractiveButton>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-receptionist text-white p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Patient Check-in</h1>
              <p className="text-sm text-white/80">AroCord Healthcare</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-receptionist">
            Self-Service Kiosk
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={shouldReduceMotion ? {} : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={shouldReduceMotion ? {} : { opacity: 0, x: -20 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
            className="w-full max-w-2xl"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-muted p-4 text-center text-sm text-muted-foreground">
        <p>Need help? Please approach the front desk</p>
      </footer>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast
            title="Check-in Successful"
            description={`Welcome, ${selectedPatient?.firstName}! Please have a seat.`}
            variant="success"
            onClose={() => setShowToast(false)}
          />
        </div>
      )}
    </div>
  )
}
