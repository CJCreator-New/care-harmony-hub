import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronDown,
  ChevronRight,
  Home,
  Users,
  Calendar,
  Stethoscope,
  Pill,
  TestTube2,
  CreditCard,
  BarChart3,
  Package,
  FileText,
  ClipboardList,
  Video,
  Settings,
  Activity,
  Brain,
  Target,
  Clock,
  Mic,
  Building,
  Shield,
  Zap,
  Heart,
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
  description?: string;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  roles: UserRole[];
  defaultExpanded?: boolean;
}

const navGroups: NavGroup[] = [
  {
    label: 'Core Operations',
    icon: Building,
    roles: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'],
    defaultExpanded: true,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'] },
      { label: 'Patients', href: '/patients', icon: Users, roles: ['admin', 'doctor', 'nurse', 'receptionist'], permission: 'patients' },
      { label: 'Appointments', href: '/appointments', icon: Calendar, roles: ['admin', 'doctor', 'nurse', 'receptionist'], permission: 'appointments' },
      { label: 'Smart Scheduler', href: '/scheduler', icon: Clock, roles: ['admin', 'receptionist'], permission: 'appointments' },
      { label: 'Queue Management', href: '/queue', icon: ClipboardList, roles: ['admin', 'doctor', 'nurse', 'receptionist'], permission: 'queue:read' },
    ]
  },
  {
    label: 'Clinical Care',
    icon: Heart,
    roles: ['admin', 'doctor', 'nurse'],
    defaultExpanded: true,
    items: [
      { label: 'Consultations', href: '/consultations', icon: Stethoscope, roles: ['admin', 'doctor', 'nurse'], permission: 'consultations:read' },
      { label: 'Telemedicine', href: '/telemedicine', icon: Video, roles: ['admin', 'doctor', 'nurse'], permission: 'telemedicine:read' },
      { label: 'Voice Clinical Notes', href: '/voice-clinical-notes', icon: Mic, roles: ['admin', 'doctor', 'nurse'], permission: 'voice-clinical-notes' },
    ]
  },
  {
    label: 'Pharmacy & Inventory',
    icon: Pill,
    roles: ['admin', 'pharmacist', 'doctor', 'nurse'],
    items: [
      { label: 'Pharmacy', href: '/pharmacy', icon: Pill, roles: ['admin', 'pharmacist', 'doctor'], permission: 'pharmacy' },
      { label: 'Clinical Pharmacy', href: '/pharmacy/clinical', icon: Stethoscope, roles: ['admin', 'pharmacist'], permission: 'clinical-pharmacy' },
      { label: 'Inventory', href: '/inventory', icon: Package, roles: ['admin', 'pharmacist'], permission: 'inventory:read' },
    ]
  },
  {
    label: 'Laboratory',
    icon: TestTube2,
    roles: ['admin', 'lab_technician', 'doctor', 'nurse'],
    items: [
      { label: 'Lab Orders', href: '/laboratory', icon: TestTube2, roles: ['admin', 'lab_technician', 'doctor', 'nurse'], permission: 'lab:read' },
      { label: 'Lab Automation', href: '/laboratory/automation', icon: Activity, roles: ['admin', 'lab_technician'], permission: 'laboratory' },
    ]
  },
  {
    label: 'AI & Analytics',
    icon: Brain,
    roles: ['admin', 'doctor'],
    items: [
      { label: 'AI Demo', href: '/ai-demo', icon: Brain, roles: ['admin', 'doctor'], permission: 'ai-demo' },
      { label: 'Differential Diagnosis', href: '/differential-diagnosis', icon: Stethoscope, roles: ['admin', 'doctor'], permission: 'differential-diagnosis' },
      { label: 'Treatment Recommendations', href: '/treatment-recommendations', icon: Pill, roles: ['admin', 'doctor'], permission: 'treatment-recommendations' },
      { label: 'Treatment Plan Optimization', href: '/treatment-plan-optimization', icon: Target, roles: ['admin', 'doctor'], permission: 'treatment-plan-optimization' },
      { label: 'Predictive Analytics', href: '/predictive-analytics', icon: BarChart3, roles: ['admin', 'doctor'], permission: 'predictive-analytics' },
      { label: 'Length of Stay Forecasting', href: '/length-of-stay-forecasting', icon: Clock, roles: ['admin', 'doctor'], permission: 'length-of-stay-forecasting' },
      { label: 'Resource Utilization', href: '/resource-utilization-optimization', icon: Target, roles: ['admin', 'doctor'], permission: 'resource-utilization-optimization' },
    ]
  },
  {
    label: 'Administration',
    icon: Shield,
    roles: ['admin'],
    items: [
      { label: 'Staff Management', href: '/settings/staff', icon: Users, roles: ['admin'], permission: 'staff-management' },
      { label: 'Staff Performance', href: '/settings/performance', icon: Activity, roles: ['admin'], permission: 'staff-performance' },
      { label: 'Activity Logs', href: '/settings/activity', icon: ClipboardList, roles: ['admin'], permission: 'activity-logs' },
      { label: 'System Monitoring', href: '/settings/monitoring', icon: Activity, roles: ['admin'], permission: 'system-monitoring' },
      { label: 'Hospital Settings', href: '/settings', icon: Settings, roles: ['admin'], permission: 'settings' },
    ]
  },
  {
    label: 'Business Operations',
    icon: BarChart3,
    roles: ['admin', 'receptionist'],
    items: [
      { label: 'Billing', href: '/billing', icon: CreditCard, roles: ['admin', 'receptionist'], permission: 'billing:read' },
      { label: 'Kiosk', href: '/kiosk', icon: Building, roles: ['admin', 'receptionist'], permission: 'patients' },
      { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin'], permission: 'reports' },
      { label: 'Workflow Dashboard', href: '/integration/workflow', icon: Zap, roles: ['admin'], permission: 'workflow-dashboard' },
    ]
  },
  {
    label: 'Patient Portal',
    icon: Users,
    roles: ['patient'],
    defaultExpanded: true,
    items: [
      { label: 'My Health Portal', href: '/patient/portal', icon: Activity, roles: ['patient'], permission: 'portal' },
      { label: 'My Appointments', href: '/patient/appointments', icon: Calendar, roles: ['patient'], permission: 'appointments:read' },
      { label: 'My Prescriptions', href: '/patient/prescriptions', icon: Pill, roles: ['patient'], permission: 'prescriptions:read' },
      { label: 'Lab Results', href: '/patient/lab-results', icon: TestTube2, roles: ['patient'], permission: 'lab:read' },
      { label: 'Medical History', href: '/patient/medical-history', icon: FileText, roles: ['patient'], permission: 'portal' },
    ]
  }
];

interface GroupedSidebarProps {
  userRole: UserRole | null;
  testRole?: UserRole | null;
  collapsed?: boolean;
  className?: string;
}

export function GroupedSidebar({ userRole, testRole, collapsed = false, className }: GroupedSidebarProps) {
  const location = useLocation();
  const activeRole = testRole || userRole;
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navGroups.forEach(group => {
      const hasActiveItem = group.items.some(item =>
        window.location.pathname === item.href ||
        window.location.pathname.startsWith(item.href + '/')
      );
      initial[group.label] = group.defaultExpanded || hasActiveItem || false;
    });
    return initial;
  });

  // Auto-expand the group that contains the currently active route
  useEffect(() => {
    navGroups.forEach(group => {
      const hasActiveItem = group.items.some(item =>
        location.pathname === item.href ||
        location.pathname.startsWith(item.href + '/')
      );
      if (hasActiveItem) {
        setExpandedGroups(prev => ({ ...prev, [group.label]: true }));
      }
    });
  }, [location.pathname]);

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  const hasAccessToGroup = (group: NavGroup) => {
    return activeRole ? group.roles.includes(activeRole) : false;
  };

  const hasAccessToItem = (item: NavItem) => {
    return activeRole ? (item.roles.includes(activeRole) &&
           (!item.permission || hasPermission(activeRole, item.permission))) : false;
  };

  const allNavHrefs = navGroups.flatMap(g => g.items.map(i => i.href));

  const isActive = (href: string) => {
    if (location.pathname === href) return true;
    if (!location.pathname.startsWith(href + '/')) return false;
    // Don't highlight parent when a more-specific sibling nav item matches exactly
    return !allNavHrefs.some(
      other => other !== href && other.startsWith(href + '/') && location.pathname === other
    );
  };

  // ── Collapsed mode: flat icon-only list with tooltips ──────────────────────
  if (collapsed) {
    const collapsedGroups = navGroups
      .filter(hasAccessToGroup)
      .map((group) => ({
        ...group,
        items: group.items.filter(hasAccessToItem),
      }))
      .filter((group) => group.items.length > 0);

    return (
      <TooltipProvider delayDuration={150}>
        <nav className={cn('flex flex-col items-center gap-1', className)} aria-label="Main navigation">
          {collapsedGroups.map((group, idx) => {
            const isLast = idx === collapsedGroups.length - 1;
            const groupActive = group.items.some((item) => isActive(item.href));
            const firstItem = group.items[0];
            const sep = !isLast && (
              <hr className="w-6 border-sidebar-border my-0.5" aria-hidden="true" />
            );

            if (group.items.length === 1) {
              return (
                <React.Fragment key={group.label}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link to={firstItem.href} aria-label={firstItem.label}>
                        <Button
                          className={cn(
                            'w-10 h-10 p-0 bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0 shadow-none',
                            isActive(firstItem.href) && 'bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_12px_hsl(var(--sidebar-ring)/0.15)]'
                          )}
                          size="icon"
                          aria-current={isActive(firstItem.href) ? 'page' : undefined}
                        >
                          <firstItem.icon className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {firstItem.label}
                    </TooltipContent>
                  </Tooltip>
                  {sep}
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={group.label}>
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className={cn(
                            'relative w-10 h-10 p-0 bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0 shadow-none',
                            groupActive && 'bg-sidebar-accent text-sidebar-accent-foreground'
                          )}
                          size="icon"
                          aria-label={`${group.label} menu`}
                        >
                          <group.icon className="h-4 w-4" />
                          <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {group.label}
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent side="right" align="start" className="w-56">
                    {group.items.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link to={item.href} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {sep}
              </React.Fragment>
            );
          })}
        </nav>
      </TooltipProvider>
    );
  }

  const accessibleGroups = navGroups
    .filter(hasAccessToGroup)
    .map((group) => {
      const accessibleItems = group.items.filter(hasAccessToItem);
      if (accessibleItems.length === 0) return null;

      const isExpanded = expandedGroups[group.label];

      return (
        <Collapsible
          key={group.label}
          open={isExpanded}
          onOpenChange={() => toggleGroup(group.label)}
        >
          <CollapsibleTrigger asChild>
            <Button
              className="w-full justify-between h-auto p-3 bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0 shadow-none"
            >
              <div className="flex items-center gap-3">
                <group.icon className="h-4 w-4 text-sidebar-foreground" />
                  <span className="font-sans font-semibold text-[0.65rem] tracking-[0.1em] uppercase text-sidebar-foreground/50">{group.label}</span>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-sidebar-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-sidebar-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pl-4">
            {accessibleItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button
                  className={cn(
                    "w-full justify-start h-auto p-2 text-sm text-sidebar-foreground bg-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0 shadow-none",
                    isActive(item.href) && "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-l-[hsl(var(--sidebar-ring))] rounded-l-none shadow-[inset_0_0_16px_hsl(var(--sidebar-ring)/0.12)]"
                  )}
                  size="sm"
                  title={item.label}
                >
                  <item.icon className="h-4 w-4 mr-3" />
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    })
    .filter(Boolean); // Remove null entries

  if (accessibleGroups.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <p className="text-sm text-sidebar-foreground/60">
          No navigation items available for your role.
        </p>
        <p className="text-xs text-sidebar-foreground/40 mt-2">
          Please contact your administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return (
    <nav className={cn("space-y-2", className)}>
      {accessibleGroups}
    </nav>
  );
}
