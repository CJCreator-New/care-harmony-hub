import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Calendar, Package, Clock, DollarSign } from 'lucide-react';

interface HospitalSettings {
  holidays: string[];
  inventory_thresholds: {
    low: number;
    critical: number;
  };
  operating_hours: {
    [day: string]: { open: string; close: string; closed: boolean };
  };
  consultation_fees: {
    [dept: string]: number;
  };
}

const defaultSettings: HospitalSettings = {
  holidays: [],
  inventory_thresholds: { low: 20, critical: 10 },
  operating_hours: {
    'Monday': { open: '09:00', close: '17:00', closed: false },
    'Tuesday': { open: '09:00', close: '17:00', closed: false },
    'Wednesday': { open: '09:00', close: '17:00', closed: false },
    'Thursday': { open: '09:00', close: '17:00', closed: false },
    'Friday': { open: '09:00', close: '17:00', closed: false },
    'Saturday': { open: '09:00', close: '13:00', closed: false },
    'Sunday': { open: '00:00', close: '00:00', closed: true },
  },
  consultation_fees: {
    'General': 500,
    'Cardiology': 1000,
    'Pediatrics': 600,
  },
};

export function SystemConfiguration() {
  const { hospitalId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<HospitalSettings>(defaultSettings);
  const [newHoliday, setNewHoliday] = useState('');

  useEffect(() => {
    if (hospitalId) {
      fetchSettings();
    }
  }, [hospitalId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select('settings')
        .eq('id', hospitalId)
        .single();

      if (error) throw error;
      if (data?.settings) {
        setSettings({ ...defaultSettings, ...(data.settings as any) });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('hospitals')
        .update({ settings })
        .eq('id', hospitalId);

      if (error) throw error;
      toast({
        title: 'Success',
        description: 'System configuration updated successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = () => {
    if (!newHoliday) return;
    if (settings.holidays.includes(newHoliday)) {
      toast({ title: 'Holiday already exists', variant: 'destructive' });
      return;
    }
    setSettings({ ...settings, holidays: [...settings.holidays, newHoliday].sort() });
    setNewHoliday('');
  };

  const removeHoliday = (date: string) => {
    setSettings({ ...settings, holidays: settings.holidays.filter(h => h !== date) });
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>System Configuration</CardTitle>
        <CardDescription>Manage global hospital settings and operational parameters</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="inventory" className="flex gap-2">
              <Package className="w-4 h-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="holidays" className="flex gap-2">
              <Calendar className="w-4 h-4" />
              Holidays
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex gap-2">
              <Clock className="w-4 h-4" />
              Hours
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex gap-2">
              <DollarSign className="w-4 h-4" />
              Fees
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Low Stock Threshold (%)</Label>
                <Input 
                  type="number" 
                  value={settings.inventory_thresholds.low}
                  onChange={(e) => setSettings({
                    ...settings, 
                    inventory_thresholds: { ...settings.inventory_thresholds, low: parseInt(e.target.value) }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Critical Stock Threshold (%)</Label>
                <Input 
                  type="number" 
                  value={settings.inventory_thresholds.critical}
                  onChange={(e) => setSettings({
                    ...settings, 
                    inventory_thresholds: { ...settings.inventory_thresholds, critical: parseInt(e.target.value) }
                  })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="holidays" className="space-y-4 pt-4">
            <div className="flex gap-2">
              <Input 
                type="date" 
                value={newHoliday}
                onChange={(e) => setNewHoliday(e.target.value)}
              />
              <Button onClick={addHoliday}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {settings.holidays.map(holiday => (
                <div key={holiday} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                  {holiday}
                  <Button variant="ghost" size="icon" onClick={() => removeHoliday(holiday)} className="h-6 w-6 text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="hours" className="space-y-4 pt-4">
            {Object.keys(settings.operating_hours).map(day => (
              <div key={day} className="grid grid-cols-4 items-center gap-4">
                <Label>{day}</Label>
                <Input 
                  type="time" 
                  value={settings.operating_hours[day].open}
                  disabled={settings.operating_hours[day].closed}
                  onChange={(e) => setSettings({
                    ...settings,
                    operating_hours: {
                      ...settings.operating_hours,
                      [day]: { ...settings.operating_hours[day], open: e.target.value }
                    }
                  })}
                />
                <Input 
                  type="time" 
                  value={settings.operating_hours[day].close}
                  disabled={settings.operating_hours[day].closed}
                  onChange={(e) => setSettings({
                    ...settings,
                    operating_hours: {
                      ...settings.operating_hours,
                      [day]: { ...settings.operating_hours[day], close: e.target.value }
                    }
                  })}
                />
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id={`closed-${day}`}
                    checked={settings.operating_hours[day].closed}
                    onChange={(e) => setSettings({
                      ...settings,
                      operating_hours: {
                        ...settings.operating_hours,
                        [day]: { ...settings.operating_hours[day], closed: e.target.checked }
                      }
                    })}
                  />
                  <Label htmlFor={`closed-${day}`}>Closed</Label>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="fees" className="space-y-4 pt-4">
            {Object.keys(settings.consultation_fees).map(dept => (
              <div key={dept} className="grid grid-cols-2 items-center gap-4">
                <Label>{dept} Dept Fee</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="number" 
                    className="pl-9"
                    value={settings.consultation_fees[dept]}
                    onChange={(e) => setSettings({
                      ...settings,
                      consultation_fees: {
                        ...settings.consultation_fees,
                        [dept]: parseInt(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save All Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
