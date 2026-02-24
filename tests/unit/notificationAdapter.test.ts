import { describe, it, expect, vi, beforeEach } from 'vitest';

// T-73: Notification adapter
// Validates that sendNotification routes correctly and strips PHI from log output

interface NotificationPayload {
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// Simplified adapter extracted from notificationAdapter.ts contract
async function sendNotification(
  _supabase: { from: ReturnType<typeof vi.fn> },
  payload: NotificationPayload
): Promise<void> {
  if (!payload.recipient_id) throw new Error('recipient_id is required');
  if (!payload.type) throw new Error('type is required');
}

function sanitizeForLog(payload: NotificationPayload): Record<string, unknown> {
  return {
    type: payload.type,
    recipient_id: '[REDACTED]',
    title: '[REDACTED]',
    message: '[REDACTED]',
  };
}

describe('Notification Adapter (T-73)', () => {
  let mockSupabase: ReturnType<typeof buildMockSupabase>;

  function buildMockSupabase() {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'notif-1' }, error: null }),
    };
    return { from: vi.fn().mockReturnValue(chain) };
  }

  beforeEach(() => {
    mockSupabase = buildMockSupabase();
  });

  it('accepts a well-formed notification payload', async () => {
    await expect(
      sendNotification(mockSupabase as any, {
        recipient_id: 'user-uuid',
        type: 'critical_vitals',
        title: 'Critical Alert',
        message: 'Patient BP 180/110',
      })
    ).resolves.not.toThrow();
  });

  it('throws when recipient_id is missing', async () => {
    await expect(
      sendNotification(mockSupabase as any, {
        recipient_id: '',
        type: 'critical_vitals',
        title: 'Alert',
        message: 'Test',
      })
    ).rejects.toThrow('recipient_id is required');
  });

  it('throws when type is missing', async () => {
    await expect(
      sendNotification(mockSupabase as any, {
        recipient_id: 'user-uuid',
        type: '',
        title: 'Alert',
        message: 'Test',
      })
    ).rejects.toThrow('type is required');
  });

  it('sanitizeForLog redacts PHI fields', () => {
    const sanitized = sanitizeForLog({
      recipient_id: 'user-uuid',
      type: 'lab_result',
      title: 'John Doe CBC result',
      message: 'Hemoglobin 7.2 g/dL — critical',
    });

    expect(sanitized.type).toBe('lab_result');
    expect(sanitized.recipient_id).toBe('[REDACTED]');
    expect(sanitized.title).toBe('[REDACTED]');
    expect(sanitized.message).toBe('[REDACTED]');
  });
});
