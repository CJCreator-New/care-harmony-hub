/**
 * ARIA Labels Utility
 * Provides consistent accessibility labels for interactive elements
 */

export const ariaLabels = {
  // Navigation
  navigation: {
    menu: 'Main navigation menu',
    sidebar: 'Sidebar navigation',
    breadcrumb: 'Breadcrumb navigation',
    skipToContent: 'Skip to main content',
  },

  // Common Actions
  actions: {
    close: 'Close dialog',
    submit: 'Submit form',
    cancel: 'Cancel action',
    delete: 'Delete item',
    edit: 'Edit item',
    save: 'Save changes',
    search: 'Search',
    filter: 'Filter results',
    sort: 'Sort results',
    refresh: 'Refresh data',
    download: 'Download',
    upload: 'Upload file',
    print: 'Print',
    share: 'Share',
    copy: 'Copy to clipboard',
    expand: 'Expand section',
    collapse: 'Collapse section',
    more: 'More options',
    settings: 'Settings',
    help: 'Help',
    info: 'Information',
  },

  // Patient Management
  patient: {
    register: 'Register new patient',
    checkIn: 'Check in patient',
    checkOut: 'Check out patient',
    viewHistory: 'View patient medical history',
    editProfile: 'Edit patient profile',
    viewAppointments: 'View patient appointments',
    viewPrescriptions: 'View patient prescriptions',
    viewLabResults: 'View patient lab results',
  },

  // Appointment Management
  appointment: {
    schedule: 'Schedule appointment',
    reschedule: 'Reschedule appointment',
    cancel: 'Cancel appointment',
    confirm: 'Confirm appointment',
    viewDetails: 'View appointment details',
    addNote: 'Add appointment note',
  },

  // Form Controls
  form: {
    required: 'This field is required',
    optional: 'This field is optional',
    error: 'Form validation error',
    success: 'Form submitted successfully',
    loading: 'Loading form data',
    clearForm: 'Clear form',
    resetForm: 'Reset form to defaults',
  },

  // Notifications
  notification: {
    close: 'Close notification',
    dismiss: 'Dismiss alert',
    viewDetails: 'View notification details',
    markAsRead: 'Mark as read',
    markAsUnread: 'Mark as unread',
  },

  // Data Tables
  table: {
    sort: 'Sort by this column',
    filter: 'Filter this column',
    selectAll: 'Select all rows',
    selectRow: 'Select this row',
    expandRow: 'Expand row details',
    pagination: 'Table pagination',
    previousPage: 'Previous page',
    nextPage: 'Next page',
  },

  // Modals & Dialogs
  modal: {
    close: 'Close modal',
    confirm: 'Confirm action',
    cancel: 'Cancel action',
  },

  // Status Indicators
  status: {
    loading: 'Loading',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
  },
};

/**
 * Get ARIA label for a specific action
 */
export function getAriaLabel(category: keyof typeof ariaLabels, action: string): string {
  const labels = ariaLabels[category];
  return (labels as Record<string, string>)[action] || action;
}

/**
 * Create ARIA label for icon buttons
 */
export function createIconButtonLabel(action: string, context?: string): string {
  const base = getAriaLabel('actions', action);
  return context ? `${base} - ${context}` : base;
}

/**
 * Create ARIA label for form fields
 */
export function createFormFieldLabel(fieldName: string, required: boolean = false): string {
  const suffix = required ? ` (${getAriaLabel('form', 'required')})` : '';
  return `${fieldName}${suffix}`;
}
