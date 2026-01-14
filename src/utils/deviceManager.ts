import { supabase } from '@/integrations/supabase/client';

export interface DeviceInfo {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip_address: string;
  location?: string;
  last_login: string;
  is_active: boolean;
  is_trusted: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionInfo {
  id: string;
  user_id: string;
  device_id: string;
  session_token: string;
  expires_at: string;
  ip_address: string;
  user_agent: string;
  is_active: boolean;
  created_at: string;
}

class DeviceManager {
  private static instance: DeviceManager;

  static getInstance(): DeviceManager {
    if (!DeviceManager.instance) {
      DeviceManager.instance = new DeviceManager();
    }
    return DeviceManager.instance;
  }

  // Generate a unique device ID
  generateDeviceId(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText(navigator.userAgent, 10, 10);
    const fingerprint = canvas.toDataURL();

    // Create a hash-like identifier
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36) + Date.now().toString(36);
  }

  // Get device information
  async getDeviceInfo(): Promise<Partial<DeviceInfo>> {
    const deviceId = this.generateDeviceId();

    // Detect device type
    const userAgent = navigator.userAgent;
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';

    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      deviceType = /iPad|Android(?=.*\bMobile\b)|Windows Phone/i.test(userAgent) ? 'tablet' : 'mobile';
    }

    // Detect browser
    let browser = 'Unknown';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    // Detect OS
    let os = 'Unknown';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    // Get IP address (this would typically come from a server-side request)
    // For now, we'll use a placeholder
    const ipAddress = await this.getIPAddress();

    return {
      device_id: deviceId,
      device_name: `${browser} on ${os}`,
      device_type: deviceType,
      browser,
      os,
      ip_address: ipAddress,
      last_login: new Date().toISOString(),
      is_active: true,
      is_trusted: false,
    };
  }

  // Get IP address (simplified - in production this should be server-side)
  private async getIPAddress(): Promise<string> {
    try {
      // This is a simplified approach - in production, use server-side IP detection
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  // Register device
  async registerDevice(userId: string): Promise<DeviceInfo | null> {
    try {
      const deviceInfo = await this.getDeviceInfo();

      const { data, error } = await supabase
        .from('user_devices')
        .upsert({
          user_id: userId,
          device_id: deviceInfo.device_id,
          device_name: deviceInfo.device_name,
          device_type: deviceInfo.device_type,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          ip_address: deviceInfo.ip_address,
          last_login: deviceInfo.last_login,
          is_active: true,
          is_trusted: false,
        }, {
          onConflict: 'user_id,device_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error registering device:', error);
        return null;
      }

      return data as DeviceInfo;
    } catch (error) {
      console.error('Error registering device:', error);
      return null;
    }
  }

  // Get user's devices
  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    try {
      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .order('last_login', { ascending: false });

      if (error) {
        console.error('Error fetching devices:', error);
        return [];
      }

      return data as DeviceInfo[];
    } catch (error) {
      console.error('Error fetching devices:', error);
      return [];
    }
  }

  // Trust/untrust device
  async toggleDeviceTrust(deviceId: string, isTrusted: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_devices')
        .update({ is_trusted: isTrusted })
        .eq('id', deviceId);

      if (error) {
        console.error('Error updating device trust:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating device trust:', error);
      return false;
    }
  }

  // Remove device
  async removeDevice(deviceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_devices')
        .delete()
        .eq('id', deviceId);

      if (error) {
        console.error('Error removing device:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error removing device:', error);
      return false;
    }
  }

  // Revoke device access (alias for removeDevice)
  async revokeDevice(deviceId: string): Promise<boolean> {
    return this.removeDevice(deviceId);
  }

  // Update device activity
  async updateDeviceActivity(deviceId: string): Promise<void> {
    try {
      await supabase
        .from('user_devices')
        .update({
          last_login: new Date().toISOString(),
          is_active: true
        })
        .eq('device_id', deviceId);
    } catch (error) {
      console.error('Error updating device activity:', error);
    }
  }
}

export const deviceManager = DeviceManager.getInstance();