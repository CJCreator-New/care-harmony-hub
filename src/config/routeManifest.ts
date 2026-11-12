import type { ElementType } from 'react';
import {
  Activity,
  BarChart3,
  Brain,
  Building,
  Calendar,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  Heart,
  Home,
  Mic,
  Package,
  Pill,
  Scan,
  Settings,
  Shield,
  Stethoscope,
  Target,
  TestTube2,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import { CANONICAL_ROLES, findRoutePolicy, type UserRole } from '@/modules/rbac';

export type ReleaseTier = 'tier1' | 'tier2' | 'tier3';

/**
 * `allowedRoles` and `requiredPermission` are not written here. They are derived
 * from the route policy in `@/modules/rbac`, which the route guard also reads.
 */
export interface AppRouteManifestItem {
  label: string;
  href: string;
  icon: ElementType;
  allowedRoles: UserRole[];
  requiredPermission?: string;
  badge?: string;
  releaseTier: ReleaseTier;
  featureFlag?: string;
  testOwner: 'unit' | 'integration' | 'api-security' | 'e2e' | 'observability';
  description?: string;
}

export interface AppRouteManifestGroup {
  label: string;
  icon: ElementType;
  allowedRoles: UserRole[];
  defaultExpanded?: boolean;
  items: AppRouteManifestItem[];
}

const manifestSource: ManifestGroupSource[] = [
  {
    label: 'Core Operations',
    icon: Building,
    defaultExpanded: true,
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: Home,
        releaseTier: 'tier1',
        testOwner: 'e2e',
      },
      {
        label: 'Patients',
        href: '/patients',
        icon: Users,
        releaseTier: 'tier1',
        testOwner: 'integration',
      },
      {
        label: 'Appointments',
        href: '/appointments',
        icon: Calendar,
        releaseTier: 'tier1',
        testOwner: 'integration',
      },
      // Temporarily disabled: feature incomplete (BUG-005)
      // { label: 'Smart Scheduler', href: '/scheduler', icon: Clock, allowedRoles: ['admin', 'receptionist'], requiredPermission: 'appointments', releaseTier: 'tier2', testOwner: 'e2e' },
      {
        label: 'Queue Management',
        href: '/queue',
        icon: ClipboardList,
        releaseTier: 'tier1',
        testOwner: 'integration',
      },
      {
        label: 'Care Protocols',
        href: '/nurse/protocols',
        icon: ClipboardList,
        releaseTier: 'tier2',
        testOwner: 'integration',
      },
    ],
  },
  {
    label: 'Clinical Care',
    icon: Heart,
    defaultExpanded: true,
    items: [
      {
        label: 'Consultations',
        href: '/consultations',
        icon: Stethoscope,
        releaseTier: 'tier1',
        testOwner: 'integration',
      },
      {
        label: 'Telemedicine',
        href: '/telemedicine',
        icon: Video,
        releaseTier: 'tier2',
        testOwner: 'e2e',
      },
      {
        label: 'Voice Clinical Notes',
        href: '/voice-clinical-notes',
        icon: Mic,
        releaseTier: 'tier2',
        testOwner: 'integration',
      },
    ],
  },
  {
    label: 'Pharmacy & Inventory',
    icon: Pill,
    items: [
      {
        label: 'Pharmacy',
        href: '/pharmacy',
        icon: Pill,
        releaseTier: 'tier1',
        testOwner: 'integration',
      },
      {
        label: 'Clinical Pharmacy',
        href: '/pharmacy/clinical',
        icon: Stethoscope,
        releaseTier: 'tier2',
        testOwner: 'integration',
      },
      {
        label: 'Inventory',
        href: '/inventory',
        icon: Package,
        releaseTier: 'tier2',
        testOwner: 'integration',
      },
    ],
  },
  {
    label: 'Laboratory',
    icon: TestTube2,
    items: [
      {
        label: 'Lab Orders',
        href: '/laboratory',
        icon: TestTube2,
        releaseTier: 'tier1',
        testOwner: 'integration',
      },
      {
        label: 'Radiology & PACS',
        href: '/radiology',
        icon: Scan,
        releaseTier: 'tier1',
        testOwner: 'integration',
      },
      {
        label: 'Lab Automation',
        href: '/laboratory/automation',
        icon: Activity,
        releaseTier: 'tier2',
        testOwner: 'api-security',
      },
    ],
  },
  {
    label: 'AI & Analytics',
    icon: Brain,
    items: [
      {
        label: 'AI Demo',
        href: '/ai-demo',
        icon: Brain,
        releaseTier: 'tier3',
        featureFlag: 'ai_demo',
        testOwner: 'integration',
      },
      {
        label: 'Differential Diagnosis',
        href: '/differential-diagnosis',
        icon: Stethoscope,
        releaseTier: 'tier3',
        featureFlag: 'ai_clinical_tools',
        testOwner: 'integration',
      },
      {
        label: 'Treatment Recommendations',
        href: '/treatment-recommendations',
        icon: Pill,
        releaseTier: 'tier3',
        featureFlag: 'ai_clinical_tools',
        testOwner: 'integration',
      },
      {
        label: 'Treatment Plan Optimization',
        href: '/treatment-plan-optimization',
        icon: Target,
        releaseTier: 'tier3',
        featureFlag: 'ai_clinical_tools',
        testOwner: 'integration',
      },
      {
        label: 'Predictive Analytics',
        href: '/predictive-analytics',
        icon: BarChart3,
        releaseTier: 'tier3',
        featureFlag: 'ai_analytics',
        testOwner: 'integration',
      },
      {
        label: 'Length of Stay Forecasting',
        href: '/length-of-stay-forecasting',
        icon: Clock,
        releaseTier: 'tier3',
        featureFlag: 'ai_analytics',
        testOwner: 'integration',
      },
      {
        label: 'Resource Utilization',
        href: '/resource-utilization-optimization',
        icon: Target,
        releaseTier: 'tier3',
        featureFlag: 'ai_analytics',
        testOwner: 'integration',
      },
    ],
  },
  {
    label: 'Administration',
    icon: Shield,
    items: [
      {
        label: 'Staff Management',
        href: '/settings/staff',
        icon: Users,
        releaseTier: 'tier1',
        testOwner: 'api-security',
      },
      {
        label: 'Staff Performance',
        href: '/settings/performance',
        icon: Activity,
        releaseTier: 'tier1',
        testOwner: 'integration',
      },
      {
        label: 'Activity Logs',
        href: '/settings/activity',
        icon: ClipboardList,
        releaseTier: 'tier1',
        testOwner: 'api-security',
      },
      {
        label: 'System Monitoring',
        href: '/settings/monitoring',
        icon: Activity,
        releaseTier: 'tier1',
        testOwner: 'api-security',
      },
      {
        label: 'System Health',
        href: '/settings/health',
        icon: Activity,
        releaseTier: 'tier3',
        featureFlag: 'system_health',
        testOwner: 'observability',
      },
      {
        label: 'Audit Logs',
        href: '/settings/audit-logs',
        icon: FileText,
        releaseTier: 'tier3',
        featureFlag: 'audit_logs',
        testOwner: 'e2e',
      },
      {
        label: 'Hospital Settings',
        href: '/settings',
        icon: Settings,
        releaseTier: 'tier1',
        testOwner: 'integration',
      },
    ],
  },
  {
    label: 'Business Operations',
    icon: BarChart3,
    items: [
      {
        label: 'Billing',
        href: '/billing',
        icon: CreditCard,
        releaseTier: 'tier1',
        testOwner: 'integration',
      },
      {
        label: 'Kiosk',
        href: '/kiosk',
        icon: Building,
        releaseTier: 'tier2',
        testOwner: 'e2e',
      },
      {
        label: 'Reports',
        href: '/reports',
        icon: BarChart3,
        releaseTier: 'tier2',
        testOwner: 'integration',
      },
      {
        label: 'Workflow Dashboard',
        href: '/integration/workflow',
        icon: Zap,
        releaseTier: 'tier1',
        testOwner: 'api-security',
      },
    ],
  },
  {
    label: 'Patient Portal',
    icon: Users,
    defaultExpanded: true,
    items: [
      {
        label: 'My Health Portal',
        href: '/patient/portal',
        icon: Activity,
        releaseTier: 'tier2',
        testOwner: 'e2e',
      },
      {
        label: 'My Appointments',
        href: '/patient/appointments',
        icon: Calendar,
        releaseTier: 'tier2',
        testOwner: 'e2e',
      },
      {
        label: 'My Prescriptions',
        href: '/patient/prescriptions',
        icon: Pill,
        releaseTier: 'tier2',
        testOwner: 'e2e',
      },
      {
        label: 'Lab Results',
        href: '/patient/lab-results',
        icon: TestTube2,
        releaseTier: 'tier2',
        testOwner: 'e2e',
      },
      {
        label: 'Medical History',
        href: '/patient/medical-history',
        icon: FileText,
        releaseTier: 'tier2',
        testOwner: 'integration',
      },
    ],
  },
];

type ManifestItemSource = Omit<AppRouteManifestItem, 'allowedRoles' | 'requiredPermission'>;
type ManifestGroupSource = Omit<AppRouteManifestGroup, 'allowedRoles' | 'items'> & {
  items: ManifestItemSource[];
};

function withPolicy(item: ManifestItemSource): AppRouteManifestItem {
  const policy = findRoutePolicy(item.href);
  return {
    ...item,
    allowedRoles: [...(policy?.roles ?? [])],
    requiredPermission: policy?.capability,
  };
}

// A group is visible to a role when any of its items is. Derived, not hand-written.
export const routeManifest: AppRouteManifestGroup[] = manifestSource.map((group) => {
  const items = group.items.map(withPolicy);
  const groupRoles = new Set(items.flatMap((item) => item.allowedRoles));
  return {
    ...group,
    allowedRoles: CANONICAL_ROLES.filter((role) => groupRoles.has(role)),
    items,
  };
});

export const flatRouteManifest = routeManifest.flatMap((group) =>
  group.items.map((item) => ({
    ...item,
    group: group.label,
  }))
);
