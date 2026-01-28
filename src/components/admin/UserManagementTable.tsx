import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  Edit2,
  UserX,
  Check,
  X,
  Search,
  Filter,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InteractiveButton,
  AnimatedInput,
} from "@/components/ui/micro-interactions"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: "admin" | "doctor" | "nurse" | "pharmacist" | "receptionist" | "patient"
  department?: string
  status: "active" | "inactive" | "pending"
  createdAt: Date
  lastLogin?: Date
}

interface UserRowProps {
  user: User
  onEdit: (user: User) => void
  onDeactivate: (userId: string) => void
  isSelected: boolean
  onSelect: (selected: boolean) => void
  index: number
}

const roleColors: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  doctor: "bg-doctor/10 text-doctor border-doctor/20",
  nurse: "bg-nurse/10 text-nurse border-nurse/20",
  pharmacist: "bg-pharmacy/10 text-pharmacy border-pharmacy/20",
  receptionist: "bg-receptionist/10 text-receptionist border-receptionist/20",
  patient: "bg-patient/10 text-patient border-patient/20",
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  doctor: "Doctor",
  nurse: "Nurse",
  pharmacist: "Pharmacist",
  receptionist: "Receptionist",
  patient: "Patient",
}

function RoleBadge({ role }: { role: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", roleColors[role] || roleColors.patient)}
    >
      {roleLabels[role] || role}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusStyles = {
    active: "bg-success/10 text-success border-success/20",
    inactive: "bg-destructive/10 text-destructive border-destructive/20",
    pending: "bg-warning/10 text-warning border-warning/20",
  }

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", statusStyles[status as keyof typeof statusStyles])}
    >
      {status === "active" && <Check className="w-3 h-3 mr-1" />}
      {status === "inactive" && <X className="w-3 h-3 mr-1" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

function UserRow({
  user,
  onEdit,
  onDeactivate,
  isSelected,
  onSelect,
  index,
}: UserRowProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.tr
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.3,
        delay: shouldReduceMotion ? 0 : index * 0.05,
      }}
      className={cn(
        "border-b transition-colors hover:bg-accent/50",
        isSelected && "bg-accent"
      )}
    >
      <td className="py-3 px-4" style={{ padding: "var(--space-3)" }}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          aria-label={`Select ${user.firstName} ${user.lastName}`}
        />
      </td>
      <td className="py-3 px-4" style={{ padding: "var(--space-3)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-admin/10 flex items-center justify-center text-admin font-semibold text-sm">
            {user.firstName.charAt(0)}
            {user.lastName.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-sm">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4" style={{ padding: "var(--space-3)" }}>
        <RoleBadge role={user.role} />
      </td>
      <td className="py-3 px-4" style={{ padding: "var(--space-3)" }}>
        <span className="text-sm text-muted-foreground">
          {user.department || "—"}
        </span>
      </td>
      <td className="py-3 px-4" style={{ padding: "var(--space-3)" }}>
        <StatusBadge status={user.status} />
      </td>
      <td className="py-3 px-4" style={{ padding: "var(--space-3)" }}>
        <span className="text-sm text-muted-foreground">
          {user.createdAt.toLocaleDateString()}
        </span>
      </td>
      <td className="py-3 px-4" style={{ padding: "var(--space-3)" }}>
        <div className="flex items-center gap-2">
          <InteractiveButton
            variant="ghost"
            size="sm"
            onClick={() => onEdit(user)}
            aria-label={`Edit ${user.firstName} ${user.lastName}`}
          >
            <Edit2 className="w-4 h-4" />
          </InteractiveButton>
          <InteractiveButton
            variant="ghost"
            size="sm"
            onClick={() => onDeactivate(user.id)}
            className="text-destructive hover:text-destructive"
            aria-label={`Deactivate ${user.firstName} ${user.lastName}`}
          >
            <UserX className="w-4 h-4" />
          </InteractiveButton>
        </div>
      </td>
    </motion.tr>
  )
}

interface UserManagementTableProps {
  users: User[]
  onEdit: (user: User) => void
  onDeactivate: (userId: string) => void
  onBulkAction?: (action: string, userIds: string[]) => void
}

export function UserManagementTable({
  users,
  onEdit,
  onDeactivate,
  onBulkAction,
}: UserManagementTableProps) {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const shouldReduceMotion = useReducedMotion()

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRole = roleFilter === null || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  const allSelected =
    filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length
  const someSelected = selectedUsers.size > 0 && !allSelected

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)))
    } else {
      setSelectedUsers(new Set())
    }
  }

  const handleSelectUser = (userId: string, selected: boolean) => {
    const newSelected = new Set(selectedUsers)
    if (selected) {
      newSelected.add(userId)
    } else {
      newSelected.delete(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleBulkAction = (action: string) => {
    if (onBulkAction) {
      onBulkAction(action, Array.from(selectedUsers))
    }
    setSelectedUsers(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
        style={{ gap: "var(--space-4)" }}
      >
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <AnimatedInput
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                {roleFilter ? roleLabels[roleFilter] : "All Roles"}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setRoleFilter(null)}>
                All Roles
              </DropdownMenuItem>
              {Object.entries(roleLabels).map(([role, label]) => (
                <DropdownMenuItem key={role} onClick={() => setRoleFilter(role)}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
            style={{ gap: "var(--space-2)" }}
          >
            <span className="text-sm text-muted-foreground">
              {selectedUsers.size} selected
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Bulk Actions
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBulkAction("activate")}>
                  Activate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("deactivate")}>
                  Deactivate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("delete")}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th
                className="py-3 px-4 text-left font-medium"
                style={{ padding: "var(--space-3)" }}
              >
                <Checkbox
                  checked={allSelected}
                  data-state={someSelected ? "indeterminate" : "unchecked"}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all users"
                />
              </th>
              <th
                className="py-3 px-4 text-left font-medium"
                style={{ padding: "var(--space-3)" }}
              >
                User
              </th>
              <th
                className="py-3 px-4 text-left font-medium"
                style={{ padding: "var(--space-3)" }}
              >
                Role
              </th>
              <th
                className="py-3 px-4 text-left font-medium"
                style={{ padding: "var(--space-3)" }}
              >
                Department
              </th>
              <th
                className="py-3 px-4 text-left font-medium"
                style={{ padding: "var(--space-3)" }}
              >
                Status
              </th>
              <th
                className="py-3 px-4 text-left font-medium"
                style={{ padding: "var(--space-3)" }}
              >
                Created
              </th>
              <th
                className="py-3 px-4 text-left font-medium"
                style={{ padding: "var(--space-3)" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user, index) => (
              <UserRow
                key={user.id}
                user={user}
                onEdit={onEdit}
                onDeactivate={onDeactivate}
                isSelected={selectedUsers.has(user.id)}
                onSelect={(selected) => handleSelectUser(user.id, selected)}
                index={index}
              />
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div
            className="py-12 text-center text-muted-foreground"
            style={{ padding: "var(--space-12)" }}
          >
            <p>No users found</p>
          </div>
        )}
      </div>
    </div>
  )
}
