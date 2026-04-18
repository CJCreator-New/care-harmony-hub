/**
 * Utility functions for exporting activity logs to CSV format
 * Supports HIPAA-compliant audit trail export
 */

import { ActivityLogRow } from '@/hooks/useActivityLogsPaginated';

export interface CSVExportOptions {
  filename?: string;
  includeDetails?: boolean;
  includeUserAgent?: boolean;
  sanitizePHI?: boolean;
}

/**
 * Format a single activity log row as CSV
 * Properly escapes quotes and commas
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let stringValue: string;

  if (typeof value === 'object') {
    stringValue = JSON.stringify(value);
  } else {
    stringValue = String(value);
  }

  // Escape quotes and wrap in quotes if needed
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert activity logs to CSV string format
 * Follows RFC 4180 CSV standard
 */
export function convertLogsToCSV(
  logs: ActivityLogRow[],
  options: CSVExportOptions = {}
): string {
  const {
    includeDetails = true,
    includeUserAgent = false,
    sanitizePHI = true,
  } = options;

  // Define CSV headers
  const headers = [
    'Timestamp',
    'User Name',
    'User Email',
    'Action',
    'Entity Type',
    'Entity ID',
    'IP Address',
    ...(includeUserAgent ? ['User Agent'] : []),
    ...(includeDetails ? ['Details', 'Previous Values', 'New Values', 'Severity'] : []),
  ];

  // Create header row
  const csvRows: string[] = [headers.map(escapeCsvValue).join(',')];

  // Add data rows
  for (const log of logs) {
    const userName = log.user
      ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim()
      : 'Unknown';

    const row = [
      new Date(log.created_at).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
      sanitizePHI ? maskValue(userName) : userName,
      log.user?.email || 'N/A',
      log.action_type,
      log.entity_type || 'N/A',
      log.entity_id || 'N/A',
      log.ip_address || 'N/A',
      ...(includeUserAgent ? [log.user_agent || 'N/A'] : []),
      ...(includeDetails ? [
        JSON.stringify(log.details || {}),
        JSON.stringify(log.old_values || {}),
        JSON.stringify(log.new_values || {}),
        log.severity || 'N/A',
      ] : []),
    ];

    csvRows.push(row.map(escapeCsvValue).join(','));
  }

  return csvRows.join('\n');
}

/**
 * Download activity logs as CSV file
 */
export function downloadLogsAsCSV(
  logs: ActivityLogRow[],
  options: CSVExportOptions = {}
): void {
  const {
    filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`,
  } = options;

  const csv = convertLogsToCSV(logs, options);

  // Create blob with UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Simple PII masking for CSV export
 * Masks email and name while keeping structure
 */
function maskValue(value: string): string {
  if (!value || value.length < 3) return value;

  if (value.includes('@')) {
    // Email: show first char + asterisks + domain
    const [local, domain] = value.split('@');
    return `${local[0]}${'*'.repeat(local.length - 1)}@${domain}`;
  }

  // Name: show first and last char with asterisks
  return `${value[0]}${'*'.repeat(value.length - 2)}${value[value.length - 1]}`;
}

/**
 * Generate CSV headers with metadata (timestamp, exported by, etc.)
 * Useful for compliance reports
 */
export function generateCSVWithMetadata(
  logs: ActivityLogRow[],
  exportedBy?: string,
  hospitalName?: string,
  options: CSVExportOptions = {}
): string {
  const metadata = [
    `# Audit Trail Export - ${new Date().toISOString()}`,
    `# Hospital: ${hospitalName || 'N/A'}`,
    `# Exported by: ${exportedBy || 'System'}`,
    `# Total Records: ${logs.length}`,
    `# Record Types: ${Array.from(new Set(logs.map((log) => log.action_type))).join(', ')}`,
    '#',
  ];

  const csv = convertLogsToCSV(logs, options);

  return metadata.join('\n') + '\n' + csv;
}
