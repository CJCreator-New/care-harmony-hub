// Alt text utility for accessibility

export const ALT_TEXT = {
  // Logo and branding
  logo: 'CareSync Hospital Management System Logo',
  logoSmall: 'CareSync Logo',
  
  // User avatars
  avatar: (name: string) => `${name}'s profile picture`,
  avatarPlaceholder: 'User profile placeholder',
  
  // Status icons
  statusSuccess: 'Success indicator',
  statusError: 'Error indicator',
  statusWarning: 'Warning indicator',
  statusInfo: 'Information indicator',
  statusPending: 'Pending status',
  
  // Action icons (decorative - use aria-label on button instead)
  decorative: '',
  
  // Charts and graphs
  chart: (type: string, title: string) => `${type} chart showing ${title}`,
  graph: (description: string) => `Graph: ${description}`,
  
  // Medical images
  xray: (bodyPart: string) => `X-ray image of ${bodyPart}`,
  scan: (type: string, bodyPart: string) => `${type} scan of ${bodyPart}`,
  
  // Documents
  document: (type: string) => `${type} document`,
  prescription: 'Prescription document',
  labReport: 'Laboratory report',
  
  // Loading states
  loading: 'Loading content',
  spinner: 'Loading indicator',
};

// Helper to determine if image is decorative
export function isDecorativeImage(purpose: 'icon' | 'illustration' | 'content'): boolean {
  return purpose === 'icon' || purpose === 'illustration';
}

// Generate alt text for dynamic content
export function generateAltText(
  type: 'patient' | 'doctor' | 'report' | 'chart',
  data: any
): string {
  switch (type) {
    case 'patient':
      return `Patient: ${data.firstName} ${data.lastName}`;
    case 'doctor':
      return `Dr. ${data.firstName} ${data.lastName}`;
    case 'report':
      return `${data.type} report for ${data.patientName}`;
    case 'chart':
      return `${data.chartType} showing ${data.metric} over ${data.period}`;
    default:
      return '';
  }
}
