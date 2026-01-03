import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
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
} from 'lucide-react';
import { UserRole } from '@/types/auth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'] },
  { label: 'Patients', href: '/patients', icon: Users, roles: ['admin', 'doctor', 'nurse', 'receptionist'] },
  { label: 'Appointments', href: '/appointments', icon: Calendar, roles: ['admin', 'doctor', 'nurse', 'receptionist'] },
  { label: 'Queue', href: '/queue', icon: ClipboardList, roles: ['admin', 'doctor', 'nurse', 'receptionist'] },
  { label: 'Consultations', href: '/consultations', icon: Stethoscope, roles: ['admin', 'doctor', 'nurse'] },
  { label: 'Pharmacy', href: '/pharmacy', icon: Pill, roles: ['admin', 'pharmacist', 'doctor'] },
  { label: 'Inventory', href: '/inventory', icon: Package, roles: ['admin', 'pharmacist'] },
  { label: 'Laboratory', href: '/laboratory', icon: TestTube2, roles: ['admin', 'lab_technician', 'doctor', 'nurse'] },
  { label: 'Documents', href: '/documents', icon: FileText, roles: ['admin', 'doctor', 'nurse', 'receptionist'] },
  { label: 'Billing', href: '/billing', icon: CreditCard, roles: ['admin', 'receptionist'] },
  { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin'] },
  { label: 'Staff Management', href: '/settings/staff', icon: Users, roles: ['admin'] },
  { label: 'Staff Performance', href: '/settings/performance', icon: Activity, roles: ['admin'] },
  { label: 'Activity Logs', href: '/settings/activity', icon: ClipboardList, roles: ['admin'] },
  { label: 'Hospital Settings', href: '/settings', icon: Settings, roles: ['admin'] },
  // Patient Portal Links
  { label: 'My Appointments', href: '/patient/appointments', icon: Calendar, roles: ['patient'] },
  { label: 'My Prescriptions', href: '/patient/prescriptions', icon: Pill, roles: ['patient'] },
  { label: 'Lab Results', href: '/patient/lab-results', icon: TestTube2, roles: ['patient'] },
  { label: 'Medical History', href: '/patient/medical-history', icon: FileText, roles: ['patient'] },
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
  const activeRole = testRole || primaryRole;
  
  const filteredNavItems = navItems.filter(
    item => activeRole && item.roles.includes(activeRole)
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
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-muted rounded-lg w-80 hover:bg-muted/80 transition-colors"
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
              <NotificationCenter />

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
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
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
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Global Search Dialog */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
