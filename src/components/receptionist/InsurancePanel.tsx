import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  CreditCard,
  DollarSign,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  HoverCard,
  InteractiveButton,
  StaggeredList,
} from "@/components/ui/micro-interactions"

interface CoverageDetails {
  planName: string
  planType: string
  effectiveDate: Date
  terminationDate?: Date
  benefits: {
    category: string
    covered: boolean
    copay?: number
    coinsurance?: number
    limit?: string
  }[]
}

interface EligibilityResult {
  status: "active" | "inactive" | "pending" | "error"
  coverage: CoverageDetails
  copay: number
  deductible: number
  deductibleMet: number
  outOfPocketMax: number
  outOfPocketMet: number
}

interface InsurancePanelProps {
  patientId: string
  patientName: string
  eligibility: EligibilityResult
  onVerify: () => void
  onRequestAuth: () => void
}

const statusConfig = {
  active: {
    icon: CheckCircle2,
    label: "Active",
    badgeClass: "bg-success/10 text-success border-success/20",
    bgClass: "bg-success/5",
  },
  inactive: {
    icon: XCircle,
    label: "Inactive",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    bgClass: "bg-destructive/5",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    badgeClass: "bg-warning/10 text-warning border-warning/20",
    bgClass: "bg-warning/5",
  },
  error: {
    icon: AlertCircle,
    label: "Error",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    bgClass: "bg-destructive/5",
  },
}

function EligibilityCard({
  eligibility,
  onVerify,
}: {
  eligibility: EligibilityResult
  onVerify: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const status = statusConfig[eligibility.status]
  const StatusIcon = status.icon

  return (
    <HoverCard>
      <div className={cn("rounded-lg border p-4", status.bgClass)} style={{ padding: "var(--space-4)" }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center",
                eligibility.status === "active" && "bg-success/10",
                eligibility.status === "inactive" && "bg-destructive/10",
                eligibility.status === "pending" && "bg-warning/10",
                eligibility.status === "error" && "bg-destructive/10"
              )}
            >
              <StatusIcon
                className={cn(
                  "w-6 h-6",
                  eligibility.status === "active" && "text-success",
                  eligibility.status === "inactive" && "text-destructive",
                  eligibility.status === "pending" && "text-warning",
                  eligibility.status === "error" && "text-destructive"
                )}
              />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{eligibility.coverage.planName}</h3>
              <p className="text-sm text-muted-foreground">
                {eligibility.coverage.planType}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={status.badgeClass}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
            {eligibility.status === "error" && (
              <InteractiveButton size="sm" variant="outline" onClick={onVerify}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </InteractiveButton>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        {eligibility.status === "active" && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-background rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Copay</p>
              <p className="text-xl font-bold">${eligibility.copay}</p>
            </div>
            <div className="bg-background rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Deductible</p>
              <p className="text-xl font-bold">
                ${eligibility.deductibleMet}/${eligibility.deductible}
              </p>
              <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-receptionist rounded-full"
                  style={{
                    width: `${Math.min(100, (eligibility.deductibleMet / eligibility.deductible) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <div className="bg-background rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Out of Pocket</p>
              <p className="text-xl font-bold">
                ${eligibility.outOfPocketMet}/${eligibility.outOfPocketMax}
              </p>
              <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-receptionist rounded-full"
                  style={{
                    width: `${Math.min(100, (eligibility.outOfPocketMet / eligibility.outOfPocketMax) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <div className="bg-background rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Effective</p>
              <p className="text-sm font-medium">
                {eligibility.coverage.effectiveDate.toLocaleDateString()}
              </p>
              {eligibility.coverage.terminationDate && (
                <p className="text-xs text-muted-foreground">
                  Until {eligibility.coverage.terminationDate.toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Coverage Details */}
        <div className="mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-sm font-medium"
          >
            Coverage Details
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {expanded && (
            <motion.div
              initial={useReducedMotion() ? {} : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 space-y-2"
            >
              {eligibility.coverage.benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-background rounded"
                >
                  <div className="flex items-center gap-2">
                    {benefit.covered ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                    <span className="text-sm">{benefit.category}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {benefit.copay !== undefined && `$${benefit.copay} copay`}
                    {benefit.coinsurance !== undefined && `${benefit.coinsurance}% coinsurance`}
                    {benefit.limit && benefit.limit}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </HoverCard>
  )
}

export function InsurancePanel({
  patientId,
  patientName,
  eligibility,
  onVerify,
  onRequestAuth,
}: InsurancePanelProps) {
  const [isVerifying, setIsVerifying] = useState(false)

  const handleVerify = async () => {
    setIsVerifying(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    onVerify()
    setIsVerifying(false)
  }

  return (
    <div className="space-y-6" style={{ gap: "var(--space-6)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Insurance Verification</h2>
          <p className="text-muted-foreground">{patientName}</p>
        </div>
        <div className="flex items-center gap-2">
          <InteractiveButton
            variant="outline"
            onClick={handleVerify}
            isLoading={isVerifying}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Verify Eligibility
          </InteractiveButton>
          <InteractiveButton onClick={onRequestAuth} className="gap-2">
            <FileText className="w-4 h-4" />
            Request Auth
          </InteractiveButton>
        </div>
      </div>

      {/* Eligibility Result */}
      <EligibilityCard eligibility={eligibility} onVerify={handleVerify} />

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ gap: "var(--space-4)" }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-receptionist" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Primary Insurance</span>
                <span className="font-medium">{eligibility.coverage.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member ID</span>
                <span className="font-medium">****1234</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Group Number</span>
                <span className="font-medium">GRP-5678</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-receptionist" />
              Estimated Costs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Office Visit</span>
                <span className="font-medium">${eligibility.copay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Specialist</span>
                <span className="font-medium">${eligibility.copay * 2}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Emergency</span>
                <span className="font-medium">${eligibility.copay * 5}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Authorization History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prior Authorization History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No prior authorizations on file</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
