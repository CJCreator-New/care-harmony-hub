import { cn } from "@/lib/utils"
import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { motion, useReducedMotion } from "framer-motion"
import {
  Users,
  BarChart3,
  Shield,
  Settings,
  Activity,
  Menu,
  X,
  ChevronDown,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { SkipToContent } from "@/components/ui/focus-ring"
import { InteractiveButton } from "@/components/ui/micro-interactions"

interface AdminDashboardLayoutProps {
  children: React.ReactNode
  activeSection: "users" | "analytics" | "security" | "settings"
}

interface NavItem {
  id: "users" | "analytics" | "security" | "settings"
  label: string
  href: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { id: "users", label: "User Management", href: "/admin/users", icon: Users },
  { id: "analytics", label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { id: "security", label: "Security", href: "/admin/security", icon: Shield },
  { id: "settings", label: "Settings", href: "/admin/settings", icon: Settings },
]

const sidebarWidth = "280px"

export function AdminDashboardLayout({
  children,
  activeSection,
}: AdminDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content link for accessibility */}
      <SkipToContent targetId="admin-main-content" />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-sidebar border-r border-sidebar-border",
          "transform transition-transform duration-300 ease-in-out lg:translate-x-0"
        )}
        style={{ width: sidebarWidth }}
        aria-label="Admin navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div
            className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border"
            style={{ padding: "var(--space-4)" }}
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-admin">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-sidebar-primary-foreground">
                Admin Portal
              </h1>
              <p className="text-xs text-sidebar-foreground/60">System Management</p>
            </div>
            <button
              className="ml-auto lg:hidden text-sidebar-foreground hover:text-sidebar-primary-foreground"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav
            className="flex-1 overflow-y-auto py-4 px-3"
            style={{ padding: "var(--space-4)" }}
            aria-label="Admin sections"
          >
            <ul className="space-y-1" style={{ gap: "var(--space-1)" }}>
              {navItems.map((item) => {
                const isActive = activeSection === item.id
                return (
                  <li key={item.id}>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-admin/10 text-admin border-l-2 border-admin"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      style={{ padding: "var(--space-3)" }}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon
                        className={cn(
                          "w-5 h-5 shrink-0",
                          isActive ? "text-admin" : "text-sidebar-foreground"
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="w-1.5 h-1.5 rounded-full bg-admin"
                          transition={{
                            duration: shouldReduceMotion ? 0 : 0.2,
                          }}
                        />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User card */}
          <div
            className="p-4 border-t border-sidebar-border"
            style={{ padding: "var(--space-4)" }}
          >
            <div
              className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent"
              style={{ padding: "var(--space-3)" }}
            >
              <Avatar className="h-10 w-10 border-2 border-admin">
                <AvatarImage src="" />
                <AvatarFallback className="bg-admin text-white text-sm font-semibold">
                  AD
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-accent-foreground truncate">
                  Admin User
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  System Administrator
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-[280px]">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b border-border">
          <div
            className="flex items-center justify-between h-full px-4 lg:px-6"
            style={{ padding: "var(--space-4) var(--space-6)" }}
          >
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Breadcrumb */}
              <nav aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 text-sm text-muted-foreground">
                  <li>
                    <Link to="/admin" className="hover:text-foreground">
                      Admin
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li className="text-foreground font-medium">
                    {navItems.find((item) => item.id === activeSection)?.label}
                  </li>
                </ol>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              {/* Role Badge */}
              <Badge
                variant="outline"
                className="hidden sm:flex items-center gap-1.5 border-admin/30 text-admin"
              >
                <Shield className="w-3 h-3" />
                Administrator
              </Badge>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-admin text-white text-xs font-semibold">
                        AD
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">Admin User</p>
                      <p className="text-xs text-muted-foreground">
                        admin@hospital.com
                      </p>
                      <Badge
                        variant="outline"
                        className="w-fit mt-1 border-admin/30 text-admin"
                      >
                        Administrator
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          id="admin-main-content"
          className="p-4 lg:p-6"
          style={{ padding: "var(--space-6)" }}
          role="main"
        >
          <motion.div
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
