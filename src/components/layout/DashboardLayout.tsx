import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { NotificationsSystem } from '@/components/common/NotificationsSystem';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { GroupedSidebar } from './GroupedSidebar';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';
import { RoleSwitcher } from '@/components/auth/RoleSwitcher';
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
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/auth';
import { getRoleLabel } from '@/types/rbac';
import { clearDevTestRole, getDevTestRole, setDevTestRole } from '@/utils/devRoleSwitch';

const roleColors: Record<UserRole, string> = {
  admin: 'admin',
  doctor: 'doctor',
  nurse: 'nurse',
  receptionist: 'receptionist',
  pharmacist: 'pharmacy',
  lab_technician: 'info',
  patient: 'patient',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { profile, hospital, primaryRole, roles, user, logout, isAuthenticated } = useAuth();
  const { logActivity } = useActivityLog();
  const navigate = useNavigate();

  const persistedTestRole = getDevTestRole(roles);

  // HIPAA-compliant session timeout - 30 min inactivity auto-logout
  useSessionTimeout({
    enabled: isAuthenticated,
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

  const handleLogout = async () => {
    logActivity({ actionType: 'logout' });
    await logout();
    navigate('/hospital');
  };

  const handleDevRoleSwitch = async (role: UserRole) => {
    if (!roles.includes(role)) {
      return { error: new Error('Role not assigned to user') };
    }

    try {
      setDevTestRole(role);
      if (user) {
        await supabase.rpc('log_security_event', {
          p_user_id: user.id,
          p_event_type: 'role_switch',
          p_user_agent: navigator.userAgent,
          p_details: { from: activeRole, to: role, dev_override: true, source: 'dev_role_switcher' },
          p_severity: 'info'
        });
      }
      window.location.reload();
      return { error: null };
    } catch (error) {
      console.error('Error switching dev role:', error);
      return { error: error as Error };
    }
  };

  const handleDevRoleReset = async () => {
    const fromRole = activeRole;
    const toRole = primaryRole;

    clearDevTestRole();
    if (user) {
      try {
        await supabase.rpc('log_security_event', {
          p_user_id: user.id,
          p_event_type: 'role_switch',
          p_user_agent: navigator.userAgent,
          p_details: { from: fromRole, to: toRole, dev_override: true, action: 'reset', source: 'dev_role_switcher' },
          p_severity: 'info'
        });
      } catch (error) {
        console.error('Error logging dev role reset:', error);
      }
    }

    window.location.reload();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Skip Navigation Link */}
      <a
        href="#main-content"
        aria-label="Skip to main content"
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
              <GroupedSidebar
                userRole={activeRole}
                testRole={persistedTestRole}
              />
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
              {/* Role Switcher - Production */}
              {roles.length > 1 && (
                <RoleSwitcher variant="default" />
              )}

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
                          {getRoleLabel(primaryRole)}
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
          <div className="mb-4">
            <Breadcrumb />
          </div>
          {children}
        </main>
      </div>

      {/* Global Search Dialog */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Role Switcher for Development */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 z-50">
          <RoleSwitcher
            variant="dev"
            roles={roles}
            currentRole={activeRole}
            onSwitchRole={handleDevRoleSwitch}
            onReset={handleDevRoleReset}
            align="end"
          />
        </div>
      )}
    </div>
  );
}
