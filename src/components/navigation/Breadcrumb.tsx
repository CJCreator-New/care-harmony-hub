import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { flatRouteManifest } from '@/config/routeManifest';

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ElementType;
}

interface BreadcrumbProps {
  className?: string;
  customItems?: BreadcrumbItem[];
}

// Route to breadcrumb mapping
const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patients',
  '/patients/new': 'New Patient',
  '/patients/profile': 'Patient Profile',
  '/appointments': 'Appointments',
  '/appointments/new': 'New Appointment',
  '/queue': 'Queue Management',
  '/consultations': 'Consultations',
  '/telemedicine': 'Telemedicine',
  '/pharmacy': 'Pharmacy',
  '/pharmacy/clinical': 'Clinical Pharmacy',
  '/inventory': 'Inventory',
  '/laboratory': 'Laboratory Queue',
  '/laboratory/automation': 'Lab Automation',
  '/laboratory/analysis': 'Hematology Analysis',
  '/laboratory/qc': 'Quality Control',
  '/reports': 'Reports',
  '/billing': 'Billing',
  '/settings': 'Settings',
  '/settings/staff': 'Staff Management',
  '/settings/performance': 'Staff Performance',
  '/settings/activity': 'Activity Logs',
  '/settings/monitoring': 'System Monitoring',
  '/profile': 'Profile Settings',
  '/messages': 'Messages',
  '/ai-demo': 'AI Demo',
  '/differential-diagnosis': 'Differential Diagnosis',
  '/treatment-recommendations': 'Treatment Recommendations',
  '/treatment-plan-optimization': 'Treatment Plan Optimization',
  '/predictive-analytics': 'Predictive Analytics',
  '/length-of-stay-forecasting': 'Length of Stay Forecasting',
  '/resource-utilization-optimization': 'Resource Utilization',
  '/voice-clinical-notes': 'Voice Clinical Notes',
  '/nurse/protocols': 'Care Protocols',
  '/documents': 'Documents',
  '/notifications': 'Notifications',
  '/integration/workflow': 'Workflow Dashboard',
  // Patient portal routes
  '/patient/portal': 'My Health Portal',
  '/patient/appointments': 'My Appointments',
  '/patient/prescriptions': 'My Prescriptions',
  '/patient/lab-results': 'Lab Results',
  '/patient/medical-history': 'Medical History',
};

// Routes that belong to a logical parent group not represented by a URL segment
const AI_ANALYTICS_ROUTES = new Set([
  '/ai-demo',
  '/differential-diagnosis',
  '/treatment-recommendations',
  '/treatment-plan-optimization',
  '/predictive-analytics',
  '/length-of-stay-forecasting',
  '/resource-utilization-optimization',
]);
const PHARMACY_INVENTORY_ROUTES = new Set([
  '/inventory',
]);

const manifestRouteLabels = Object.fromEntries(
  flatRouteManifest.map((route) => [route.href, route.label]),
);

export function Breadcrumb({ className, customItems }: BreadcrumbProps) {
  const location = useLocation();
  const { hospital } = useAuth();
  const hospitalId = hospital?.id;

  // Detect if we're on a patient profile page and fetch the patient name
  const patientIdMatch = location.pathname.match(/^\/patients\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  const patientId = patientIdMatch ? patientIdMatch[1] : null;

  const { data: patientName } = useQuery({
    queryKey: ['breadcrumb-patient', hospitalId, patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('patients')
        .select('first_name, last_name')
        .eq('id', patientId!)
        .single();
      return data ? `${data.first_name} ${data.last_name}` : 'Patient Details';
    },
    enabled: !!patientId,
    staleTime: 5 * 60 * 1000,
  });

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems) {
      return customItems;
    }

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/dashboard', icon: Home }
    ];

    let currentPath = '';

    for (const segment of pathSegments) {
      currentPath += `/${segment}`;
      const label = routeLabels[currentPath] || manifestRouteLabels[currentPath];

      // Dynamic segments (UUIDs / numeric IDs) must be checked first regardless of routeLabels
      if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // UUID - check if this is a patient profile (previous segment was 'patients')
        const prevSegment = pathSegments[pathSegments.indexOf(segment) - 1];
        const label = prevSegment === 'patients' && patientName ? patientName : 'Details';
        breadcrumbs.push({ label, href: currentPath });
      } else if (segment.match(/^\d+$/)) {
        // Numeric ID
        breadcrumbs.push({ label: 'Details', href: currentPath });
      } else if (label) {
        breadcrumbs.push({ label, href: currentPath });
      }
    }

    return breadcrumbs;
  };

  let breadcrumbs = generateBreadcrumbs();

  // Inject "AI & Analytics" parent for AI sub-pages — moved inside function scope for consistency
  if (AI_ANALYTICS_ROUTES.has(location.pathname) && !breadcrumbs.some(b => b.label === 'AI & Analytics')) {
    breadcrumbs = [
      breadcrumbs[0],
      { label: 'AI & Analytics', href: '/ai-demo' },
      ...breadcrumbs.slice(1),
    ];
  }
  if (PHARMACY_INVENTORY_ROUTES.has(location.pathname) && !breadcrumbs.some(b => b.label === 'Pharmacy & Inventory')) {
    breadcrumbs = [
      breadcrumbs[0],
      { label: 'Pharmacy & Inventory', href: '/pharmacy' },
      ...breadcrumbs.slice(1),
    ];
  }

  if (breadcrumbs.length <= 1) {
    return null; // Don't show breadcrumbs if we're only at home
  }

  return (
    <nav
      className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}
      aria-label="Breadcrumb"
    >
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const Icon = item.icon;

        return (
          <div key={`${item.href}-${index}`} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground/50" />
            )}

            {isLast ? (
              <span className="font-medium text-foreground flex items-center gap-1">
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// Hook for programmatic breadcrumb management
export function useBreadcrumbs() {
  const location = useLocation();

  const setBreadcrumbs = (items: BreadcrumbItem[]) => {
    // This would typically integrate with a global state management solution
    // For now, we'll just return the items for use in components
    return items;
  };

  const getCurrentBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/dashboard', icon: Home }
    ];

    let currentPath = '';

    for (const segment of pathSegments) {
      currentPath += `/${segment}`;
      const label = routeLabels[currentPath] || manifestRouteLabels[currentPath];

      if (label) {
        breadcrumbs.push({ label, href: currentPath });
      }
    }

    return breadcrumbs;
  };

  return {
    setBreadcrumbs,
    getCurrentBreadcrumbs,
  };
}
