import { supabase } from '@/integrations/supabase/client';

export interface IoTDevice {
  id: string;
  type: 'vital_monitor' | 'equipment' | 'inventory_sensor' | 'environmental';
  location: string;
  status: 'online' | 'offline' | 'maintenance';
  lastReading: any;
}

export const iotIntegration = {
  async trackEquipment(equipmentId: string) {
    const { data } = await supabase
      .from('iot_devices')
      .select('*')
      .eq('id', equipmentId)
      .single();
    
    return data;
  },

  async monitorInventory(itemId: string) {
    return {
      currentLevel: 45,
      threshold: 20,
      autoReorderEnabled: true,
      lastUpdated: new Date()
    };
  },

  async getEnvironmentalData(roomId: string) {
    return {
      temperature: 22.5,
      humidity: 45,
      airQuality: 'Good',
      lastUpdated: new Date()
    };
  },

  async integrateWearable(patientId: string, deviceId: string) {
    const { error } = await supabase
      .from('patient_devices')
      .insert({ patient_id: patientId, device_id: deviceId });
    
    if (error) throw error;
    return { success: true };
  },

  async getDeviceReadings(deviceId: string, hours: number = 24) {
    const { data } = await supabase
      .from('device_readings')
      .select('*')
      .eq('device_id', deviceId)
      .gte('timestamp', new Date(Date.now() - hours * 3600000).toISOString());
    
    return data || [];
  }
};
