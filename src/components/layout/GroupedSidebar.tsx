import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
      { label: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'], permission: '*' as Permission },
      { label: 'Patients', href: '/patients', icon: Users, roles: ['admin', 'doctor', 'nurse', 'receptionist'], permission: 'patients' },
      { label: 'Appointments', href: '/appointments', icon: Calendar, roles: ['admin', 'doctor', 'nurse', 'receptionist'], permission: 'appointments' },
      { label: 'Queue Management', href: '/queue', icon: ClipboardList, roles: ['admin', 'doctor', 'nurse', 'receptionist'], permission: 'queue' },
    ]
  },
  {
    label: 'Clinical Care',
    icon: Heart,
    roles: ['admin', 'doctor', 'nurse'],
    defaultExpanded: true,
    items: [
      { label: 'Consultations', href: '/consultations', icon: Stethoscope, roles: ['admin', 'doctor', 'nurse'], permission: 'consultations' },
      { label: 'Telemedicine', href: '/telemedicine', icon: Video, roles: ['admin', 'doctor', 'nurse'], permission: 'telemedicine' },
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
      { label: 'Inventory', href: '/inventory', icon: Package, roles: ['admin', 'pharmacist', 'nurse'], permission: 'inventory:read' },
    ]
  },
  {
    label: 'Laboratory',
    icon: TestTube2,
    roles: ['admin', 'lab_technician', 'doctor', 'nurse'],
    items: [
      { label: 'Laboratory', href: '/laboratory', icon: TestTube2, roles: ['admin', 'lab_technician', 'doctor', 'nurse'], permission: 'lab' },
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
      { label: 'Billing', href: '/billing', icon: CreditCard, roles: ['admin', 'receptionist'], permission: 'billing' },
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
  userRole: UserRole;
  testRole?: UserRole | null;
  className?: string;
}

export function GroupedSidebar({ userRole, testRole, className }: GroupedSidebarProps) {
  const location = useLocation();
  const activeRole = testRole || userRole;
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navGroups.forEach(group => {
      initial[group.label] = group.defaultExpanded || false;
    });
    return initial;
  });

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  const hasAccessToGroup = (group: NavGroup) => {
    return group.roles.includes(activeRole);
  };

  const hasAccessToItem = (item: NavItem) => {
    return item.roles.includes(activeRole) &&
           (!item.permission || hasPermission(activeRole, item.permission));
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <nav className={cn("space-y-2", className)}>
      {navGroups
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
                  variant="ghost"
                  className="w-full justify-between h-auto p-3 hover:bg-accent/50"
                >
                  <div className="flex items-center gap-3">
                    <group.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{group.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pl-4">
                {accessibleItems.map((item) => (
                  <Link key={item.href} to={item.href}>
                    <Button
                      variant={isActive(item.href) ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start h-auto p-2 text-sm",
                        isActive(item.href) && "bg-accent text-accent-foreground"
                      )}
                      size="sm"
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
        })}
    </nav>
  );
}