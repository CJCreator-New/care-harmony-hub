import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { NotificationsSystem } from '@/components/common/NotificationsSystem';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { GroupedSidebar } from './GroupedSidebar';
import { Breadcrumb } from '@/components/navigation/Breadcrumb';
import { RoleSwitcher } from '@/components/auth/RoleSwitcher';
import { SkipNavigation } from '@/components/accessibility/SkipNavigation';
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
  ChevronLeft,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const { profile, hospital, primaryRole, roles, user, logout } = useAuth();
  const { logActivity } = useActivityLog();
  const navigate = useNavigate();
  const location = useLocation();

  const persistedTestRole = getDevTestRole(roles);

  // Detect macOS for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  // Session timeout is handled centrally in AuthContext — no duplicate here.

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

  useEffect(() => {
    // Reset modal states on route change (BUG-002)
    setSidebarOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    // Keep authenticated-app title stable across dashboard interactions (PAT-022).
    document.title = 'CareSync HIMS | Modern Hospital Management System';
  }, [location.pathname]);

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
      <SkipNavigation targetId="main-content" />

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
          "fixed top-0 left-0 z-50 h-full bg-sidebar transform transition-all duration-300 ease-in-out lg:translate-x-0",
          sidebarCollapsed ? "w-16" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-3 h-16 border-b border-sidebar-border">
            <Link to="/dashboard" className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary shrink-0">
                <Activity className="w-5 h-5 text-primary-foreground" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-sidebar-primary-foreground">AROCORD</h1>
                  <p className="text-xs text-sidebar-foreground/60">HIMS</p>
                </div>
              )}
            </Link>
            {/* Desktop collapse toggle */}
            <button
              className="hidden lg:flex shrink-0 items-center justify-center w-8 h-8 rounded-md text-sidebar-foreground hover:text-sidebar-primary-foreground hover:bg-sidebar-accent transition-colors"
              onClick={(e) => {
                const next = !sidebarCollapsed;
                setSidebarCollapsed(next);
                try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
                // BUG-24: Blur the button after collapse so focus doesn't accidentally
                // remain on it — preventing scroll/keyboard events from re-triggering shortcuts.
                (e.currentTarget as HTMLButtonElement).blur();
              }}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", sidebarCollapsed && "rotate-180")} />
            </button>
            {/* Mobile close */}
            <button
              className="lg:hidden shrink-0 text-sidebar-foreground hover:text-sidebar-primary-foreground"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className={cn("flex-1 overflow-y-auto py-4", sidebarCollapsed ? "px-2" : "px-3")}>
              <GroupedSidebar
                userRole={activeRole}
                testRole={persistedTestRole}
                collapsed={sidebarCollapsed}
              />
          </nav>

          {/* User card */}
          <div className="p-3 border-t border-sidebar-border">
            {sidebarCollapsed ? (
              <div className="flex justify-center">
                <Avatar className="h-9 w-9 border-2 border-sidebar-primary">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
                    {profile ? getInitials(profile.first_name, profile.last_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
            ) : (
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
                  {activeRole && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 mt-1 text-[10px] font-semibold bg-sidebar-primary/20 text-sidebar-primary-foreground">
                      {getRoleLabel(activeRole)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      {/* BUG-37: Use transition-[padding-left] instead of transition-all to avoid creating a GPU
           compositing layer that can trap position:fixed overlay children (dialog backdrops). */}
      <div className={cn("transition-[padding-left] duration-300 min-h-screen", sidebarCollapsed ? "lg:pl-16" : "lg:pl-64")}>
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

              {/* Mobile search icon — visible only on small screens */}
              <button
                onClick={() => setSearchOpen(true)}
                className="md:hidden p-2 rounded-lg hover:bg-accent"
                aria-label="Open search dialog"
              >
                <Search className="w-5 h-5 text-muted-foreground" />
              </button>
              
              {/* Search — full bar visible on md+ */}
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-muted rounded-lg w-80 hover:bg-muted/80 transition-colors"
                aria-label="Open search dialog"
              >
                <Search className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 text-left text-sm text-muted-foreground">
                  Search patients, appointments, Rx, labs…
                </span>
                <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-background px-1.5 font-mono text-xs text-muted-foreground">
                  {isMac ? '⌘K' : 'Ctrl K'}
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Role Switcher - Production only (hidden in dev mode to avoid conflicting with the dev role switcher) */}
              {roles.length > 1 && !import.meta.env.DEV && (
                <RoleSwitcher variant="default" currentRole={activeRole} />
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
                      {activeRole && (
                        <Badge variant={roleColors[activeRole] as any} className="w-fit mt-1">
                          {getRoleLabel(activeRole)}
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
        <main id="main-content" className={cn("p-4 lg:p-6", import.meta.env.DEV && "pb-24")} role="main">
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
