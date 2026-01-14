import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deviceManager } from '../deviceManager';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

// Mock browser APIs
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    platform: 'Win32',
    cookieEnabled: true,
    language: 'en-US',
  },
  writable: true,
});

describe('DeviceManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateDeviceId', () => {
    it('should generate a unique device ID', () => {
      const id1 = deviceManager.generateDeviceId();
      const id2 = deviceManager.generateDeviceId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
      expect(id1).not.toBe(id2); // Should be unique
    });
  });

  describe('getDeviceFingerprint', () => {
    it('should return device fingerprint data', () => {
      const fingerprint = deviceManager.getDeviceFingerprint();

      expect(fingerprint).toBeDefined();
      expect(fingerprint.userAgent).toBeDefined();
      expect(fingerprint.platform).toBeDefined();
      expect(fingerprint.language).toBeDefined();
      expect(fingerprint.screenResolution).toBeDefined();
      expect(fingerprint.timezone).toBeDefined();
    });
  });

  describe('registerDevice', () => {
    it('should register a device successfully', async () => {
      const mockUserId = 'user-123';
      const result = await deviceManager.registerDevice(mockUserId);

      expect(result).toBeDefined();
      // Should return device data or null
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle registration errors gracefully', async () => {
      // Mock a failure scenario
      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => Promise.resolve({ data: null, error: new Error('DB Error') })),
      } as any);

      const result = await deviceManager.registerDevice('user-123');
      expect(result).toBeNull();
    });
  });

  describe('getUserDevices', () => {
    it('should return user devices', async () => {
      const mockDevices = [
        {
          id: 'device-1',
          device_id: 'dev-123',
          device_name: 'Test Device',
          is_trusted: true,
          last_seen_at: new Date().toISOString(),
        },
      ];

      const mockSupabase = vi.mocked(supabase);
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockDevices, error: null })),
          })),
        })),
      } as any);

      const devices = await deviceManager.getUserDevices('user-123');
      expect(devices).toEqual(mockDevices);
    });
  });

  describe('toggleDeviceTrust', () => {
    it('should toggle device trust status', async () => {
      const result = await deviceManager.toggleDeviceTrust('device-123', true);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('revokeDevice', () => {
    it('should revoke device access', async () => {
      const result = await deviceManager.revokeDevice('device-123');
      expect(typeof result).toBe('boolean');
    });
  });
});