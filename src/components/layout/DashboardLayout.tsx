import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { NotificationsSystem } from '@/components/common/NotificationsSystem';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GlobalSearchDialog } from '@/components/search/GlobalSearchDialog';
import {
  Home,
  Users,
  Calendar,
  Stethoscope,
  Pill,
  TestTube2,
  CreditCard,
  Bell,
  BarChart3,
  Package,
  FileText,
  ClipboardList,
  Video,
  Settings,
  LogOut,
  Menu,
  X,
  Activity,
  ChevronDown,
  Search,
  Brain,
  Target,
  Clock,
  Mic,
} from 'lucide-react';
import { UserRole } from '@/types/auth';
import { hasPermission, Permission } from '@/lib/permissions';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  permission?: Permission;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'], permission: '*' as Permission },
  { label: 'Patients', href: '/patients', icon: Users, roles: ['admin', 'doctor', 'nurse', 'receptionist'], permission: 'patients' },
  { label: 'Appointments', href: '/appointments', icon: Calendar, roles: ['admin', 'doctor', 'nurse', 'receptionist'], permission: 'appointments' },
  { label: 'Queue', href: '/queue', icon: ClipboardList, roles: ['admin', 'doctor', 'nurse', 'receptionist'], permission: 'queue' },
  { label: 'Consultations', href: '/consultations', icon: Stethoscope, roles: ['admin', 'doctor', 'nurse'], permission: 'consultations' },
  { label: 'Telemedicine', href: '/telemedicine', icon: Video, roles: ['admin', 'doctor', 'nurse'], permission: 'telemedicine' },
  { label: 'Pharmacy', href: '/pharmacy', icon: Pill, roles: ['admin', 'pharmacist', 'doctor'], permission: 'pharmacy' },
  { label: 'Clinical Pharmacy', href: '/pharmacy/clinical', icon: Stethoscope, roles: ['admin', 'pharmacist'], permission: 'clinical-pharmacy' },
  { label: 'Inventory', href: '/inventory', icon: Package, roles: ['admin', 'pharmacist', 'nurse'], permission: 'inventory:read' },
  { label: 'Laboratory', href: '/laboratory', icon: TestTube2, roles: ['admin', 'lab_technician', 'doctor', 'nurse'], permission: 'lab' },
  { label: 'Lab Automation', href: '/laboratory/automation', icon: Activity, roles: ['admin', 'lab_technician'], permission: 'laboratory' },
  { label: 'Workflow Dashboard', href: '/integration/workflow', icon: BarChart3, roles: ['admin'], permission: 'workflow-dashboard' },
  { label: 'Documents', href: '/documents', icon: FileText, roles: ['admin', 'doctor', 'nurse', 'receptionist'], permission: 'patients' },
  { label: 'Billing', href: '/billing', icon: CreditCard, roles: ['admin', 'receptionist'], permission: 'billing' },
  { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin'], permission: 'reports' },
  { label: 'Staff Management', href: '/settings/staff', icon: Users, roles: ['admin'], permission: 'staff-management' },
  { label: 'Staff Performance', href: '/settings/performance', icon: Activity, roles: ['admin'], permission: 'staff-performance' },
  { label: 'Activity Logs', href: '/settings/activity', icon: ClipboardList, roles: ['admin'], permission: 'activity-logs' },
  { label: 'System Monitoring', href: '/settings/monitoring', icon: Activity, roles: ['admin'], permission: 'system-monitoring' },
  { label: 'AI Demo', href: '/ai-demo', icon: Brain, roles: ['admin', 'doctor'], permission: 'ai-demo' },
  { label: 'Differential Diagnosis', href: '/differential-diagnosis', icon: Stethoscope, roles: ['admin', 'doctor'], permission: 'differential-diagnosis' },
  { label: 'Treatment Recommendations', href: '/treatment-recommendations', icon: Pill, roles: ['admin', 'doctor'], permission: 'treatment-recommendations' },
  { label: 'Treatment Plan Optimization', href: '/treatment-plan-optimization', icon: Target, roles: ['admin', 'doctor'], permission: 'treatment-plan-optimization' },
  { label: 'Predictive Analytics', href: '/predictive-analytics', icon: BarChart3, roles: ['admin', 'doctor'], permission: 'predictive-analytics' },
  { label: 'Length of Stay Forecasting', href: '/length-of-stay-forecasting', icon: Clock, roles: ['admin', 'doctor'], permission: 'length-of-stay-forecasting' },
  { label: 'Resource Utilization Optimization', href: '/resource-utilization-optimization', icon: Target, roles: ['admin', 'doctor'], permission: 'resource-utilization-optimization' },
  { label: 'Voice Clinical Notes', href: '/voice-clinical-notes', icon: Mic, roles: ['admin', 'doctor', 'nurse'], permission: 'voice-clinical-notes' },
  { label: 'Hospital Settings', href: '/settings', icon: Settings, roles: ['admin'], permission: 'settings' },
  // Patient Portal Links
  { label: 'My Health Portal', href: '/patient/portal', icon: Activity, roles: ['patient'], permission: 'portal' },
  { label: 'My Appointments', href: '/patient/appointments', icon: Calendar, roles: ['patient'], permission: 'appointments:read' },
  { label: 'My Prescriptions', href: '/patient/prescriptions', icon: Pill, roles: ['patient'], permission: 'prescriptions:read' },
  { label: 'Lab Results', href: '/patient/lab-results', icon: TestTube2, roles: ['patient'], permission: 'lab:read' },
  { label: 'Medical History', href: '/patient/medical-history', icon: FileText, roles: ['patient'], permission: 'portal' },
];

const roleColors: Record<UserRole, string> = {
  admin: 'admin',
  doctor: 'doctor',
  nurse: 'nurse',
  receptionist: 'receptionist',
  pharmacist: 'pharmacy',
  lab_technician: 'info',
  patient: 'patient',
};

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  doctor: 'Doctor',
  nurse: 'Nurse',
  receptionist: 'Receptionist',
  pharmacist: 'Pharmacist',
  lab_technician: 'Lab Technician',
  patient: 'Patient',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  testRole?: 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'lab_technician' | 'patient' | null;
}

export function DashboardLayout({ children, testRole }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { profile, hospital, primaryRole, logout, isAuthenticated } = useAuth();
  const { logActivity } = useActivityLog();
  const location = useLocation();
  const navigate = useNavigate();

  // Get testRole from localStorage only in development
  const persistedTestRole = import.meta.env.DEV ? (testRole || (() => {
    const stored = localStorage.getItem('testRole');
    return stored ? stored as 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'lab_technician' | 'patient' : null;
  })()) : null;

  // HIPAA-compliant session timeout - 30 min inactivity auto-logout
  useSessionTimeout({
    enabled: isAuthenticated,
    onTimeout: () => navigate('/hospital/login'),
  });

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Use test role for navigation if provided, otherwise use actual role
  const activeRole = persistedTestRole || primaryRole;
  
  const filteredNavItems = navItems.filter(
    item => activeRole && item.roles.includes(activeRole) && 
    (!item.permission || hasPermission(activeRole, item.permission))
  );

  const handleLogout = async () => {
    logActivity({ actionType: 'logout' });
    await logout();
    navigate('/hospital');
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Skip Navigation Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-sidebar transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-sidebar-primary-foreground">AROCORD</h1>
              <p className="text-xs text-sidebar-foreground/60">HIMS</p>
            </div>
            <button
              className="ml-auto lg:hidden text-sidebar-foreground hover:text-sidebar-primary-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User card */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent">
              <Avatar className="h-10 w-10 border-2 border-sidebar-primary">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
                  {profile ? getInitials(profile.first_name, profile.last_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-accent-foreground truncate">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {hospital?.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-accent"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
              
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-muted rounded-lg w-80 hover:bg-muted/80 transition-colors"
                aria-label="Open search dialog"
              >
                <Search className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 text-left text-sm text-muted-foreground">
                  Search patients, appointments...
                </span>
                <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-background px-1.5 font-mono text-xs text-muted-foreground">
                  ⌘K
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notifications */}
              <NotificationsSystem />

              {/* Logout Button */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-2 text-muted-foreground hover:text-destructive min-h-[48px]"
                aria-label="Logout from application"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">Logout</span>
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {profile ? getInitials(profile.first_name, profile.last_name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium">
                        {profile?.first_name} {profile?.last_name}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{profile?.first_name} {profile?.last_name}</p>
                      <p className="text-xs text-muted-foreground">{profile?.email}</p>
                      {primaryRole && (
                        <Badge variant={roleColors[primaryRole] as any} className="w-fit mt-1">
                          {roleLabels[primaryRole]}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <Settings className="w-4 h-4 mr-2" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="p-4 lg:p-6" role="main">
          {children}
        </main>
      </div>

      {/* Global Search Dialog */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
