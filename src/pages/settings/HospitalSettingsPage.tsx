import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Bell,
  Save,
  Upload,
  Loader2
} from 'lucide-react';

interface HospitalSettings {
  notifications: {
    emailAppointmentReminders: boolean;
    emailLabResults: boolean;
    emailPrescriptionReady: boolean;
    smsAppointmentReminders: boolean;
  };
  workingHours: {
    start: string;
    end: string;
  };
  appointmentDuration: number;
}

const defaultSettings: HospitalSettings = {
  notifications: {
    emailAppointmentReminders: true,
    emailLabResults: true,
    emailPrescriptionReady: true,
    smsAppointmentReminders: false,
  },
  workingHours: {
    start: '08:00',
    end: '18:00',
  },
  appointmentDuration: 30,
};

export default function HospitalSettingsPage() {
  const { hospital } = useAuth();
  const { logActivity } = useActivityLog();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    license_number: '',
  });

  const [settings, setSettings] = useState<HospitalSettings>(defaultSettings);

  useEffect(() => {
    if (hospital) {
      setFormData({
        name: hospital.name || '',
        address: hospital.address || '',
        city: hospital.city || '',
        state: hospital.state || '',
        zip: hospital.zip || '',
        phone: hospital.phone || '',
        email: hospital.email || '',
        license_number: hospital.license_number || '',
      });

      // Load settings from hospital.settings JSON
      loadSettings();
    }
  }, [hospital]);

  const loadSettings = async () => {
    if (!hospital?.id) return;
    
    const { data } = await supabase
      .from('hospitals')
      .select('settings')
      .eq('id', hospital.id)
      .single();

    if (data?.settings) {
      setSettings({ ...defaultSettings, ...(data.settings as any) });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (key: keyof HospitalSettings['notifications']) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  const handleSave = async () => {
    if (!hospital?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('hospitals')
        .update({
          name: formData.name,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          phone: formData.phone,
          email: formData.email,
          license_number: formData.license_number,
          settings: settings as unknown as Record<string, any>,
        })
        .eq('id', hospital.id);

      if (error) throw error;

      await logActivity({
        actionType: 'settings_update',
        entityType: 'hospital',
        entityId: hospital.id,
        details: { updated_fields: Object.keys(formData) },
      });

      toast({
        title: "Settings saved",
        description: "Hospital settings have been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hospital Settings</h1>
          <p className="text-muted-foreground">
            Manage your hospital information and notification preferences.
          </p>
        </div>

        {/* Hospital Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Hospital Information
            </CardTitle>
            <CardDescription>
              Update your hospital's basic information and contact details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Hospital Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter hospital name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  name="license_number"
                  value={formData.license_number}
                  onChange={handleInputChange}
                  placeholder="Enter license number"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Street address"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="State"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  name="zip"
                  value={formData.zip}
                  onChange={handleInputChange}
                  placeholder="ZIP code"
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(555) 555-5555"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="hospital@example.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Configure how and when notifications are sent to patients.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Email Notifications</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Appointment Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email reminders 24 hours before appointments
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.emailAppointmentReminders}
                    onCheckedChange={() => handleNotificationChange('emailAppointmentReminders')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lab Results Ready</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify patients when their lab results are available
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.emailLabResults}
                    onCheckedChange={() => handleNotificationChange('emailLabResults')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Prescription Ready</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify patients when their prescription is ready for pickup
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.emailPrescriptionReady}
                    onCheckedChange={() => handleNotificationChange('emailPrescriptionReady')}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">SMS Notifications</h4>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Appointment Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Send SMS reminders 2 hours before appointments
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.smsAppointmentReminders}
                  onCheckedChange={() => handleNotificationChange('smsAppointmentReminders')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Working Hours</CardTitle>
            <CardDescription>
              Set your hospital's operating hours for appointment scheduling.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="start_time">Opening Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={settings.workingHours.start}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    workingHours: { ...prev.workingHours, start: e.target.value }
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">Closing Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={settings.workingHours.end}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    workingHours: { ...prev.workingHours, end: e.target.value }
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Default Appointment Duration</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  max="120"
                  step="15"
                  value={settings.appointmentDuration}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    appointmentDuration: parseInt(e.target.value) || 30
                  }))}
                />
                <p className="text-xs text-muted-foreground">Minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
