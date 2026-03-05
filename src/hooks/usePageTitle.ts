import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BASE_TITLE = 'CareSync HIMS';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/consultations': 'Consultations',
  '/pharmacy': 'Pharmacy',
  '/pharmacy/clinical': 'Clinical Pharmacy',
  '/laboratory': 'Laboratory',
  '/laboratory/automation': 'Lab Automation',
  '/billing': 'Billing',
  '/inventory': 'Inventory',
  '/reports': 'Reports',
  '/queue': 'Queue Management',
  '/scheduler': 'Smart Scheduler',
  '/telemedicine': 'Telemedicine',
  '/voice-clinical-notes': 'Voice Clinical Notes',
  '/messages': 'Messages',
  '/notifications': 'Notifications',
  '/documents': 'Documents',
  '/settings': 'Hospital Settings',
  '/settings/staff': 'Staff Management',
  '/settings/performance': 'Staff Performance',
  '/settings/activity': 'Activity Logs',
  '/settings/monitoring': 'System Monitoring',
  '/profile': 'My Profile',
  '/patient/portal': 'My Health Portal',
  '/patient/appointments': 'My Appointments',
  '/patient/prescriptions': 'My Prescriptions',
  '/patient/lab-results': 'Lab Results',
  '/patient/medical-history': 'Medical History',
  '/ai-demo': 'AI Demo',
  '/differential-diagnosis': 'Differential Diagnosis',
  '/treatment-recommendations': 'Treatment Recommendations',
  '/treatment-plan-optimization': 'Treatment Plan Optimization',
  '/predictive-analytics': 'Predictive Analytics',
  '/length-of-stay-forecasting': 'Length of Stay Forecasting',
  '/resource-utilization-optimization': 'Resource Utilization',
  '/integration/workflow': 'Workflow Dashboard',
};

/**
 * Updates document.title to reflect the current route.
 * Call once in DashboardLayout (or another layout component)
 * instead of separate `document.title =` calls per page.
 *
 * @param custom - Optional override; pass a page-specific title from a page component
 *                 (e.g. a patient name after it loads) to replace the route default.
 */
export function usePageTitle(custom?: string): void {
  const { pathname } = useLocation();

  useEffect(() => {
    if (custom) {
      document.title = `${custom} | ${BASE_TITLE}`;
      return;
    }

    // Exact match first, then longest-prefix match for dynamic segments
    const exact = ROUTE_TITLES[pathname];
    if (exact) {
      document.title = `${exact} | ${BASE_TITLE}`;
      return;
    }

    const prefix = Object.keys(ROUTE_TITLES)
      .filter((r) => pathname.startsWith(r + '/'))
      .sort((a, b) => b.length - a.length)[0];

    if (prefix) {
      document.title = `${ROUTE_TITLES[prefix]} | ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }
  }, [pathname, custom]);
}
