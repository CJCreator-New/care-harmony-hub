import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Building2,
  Clock,
  Users,
  Stethoscope,
  Pill,
  TestTube2,
  CreditCard,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  icon: React.ElementType;
  enabled: boolean;
}

const defaultDepartments: Department[] = [
  { id: 'outpatient', name: 'Outpatient', icon: Users, enabled: true },
  { id: 'consultations', name: 'Consultations', icon: Stethoscope, enabled: true },
  { id: 'pharmacy', name: 'Pharmacy', icon: Pill, enabled: true },
  { id: 'laboratory', name: 'Laboratory', icon: TestTube2, enabled: true },
  { id: 'billing', name: 'Billing', icon: CreditCard, enabled: true },
];

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { hospital } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>(defaultDepartments);
  const [workingHours, setWorkingHours] = useState({
    openTime: '08:00',
    closeTime: '18:00',
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  });
  const [additionalInfo, setAdditionalInfo] = useState({
    specializations: '',
    description: '',
  });

  const days = [
    { id: 'monday', label: 'Mon' },
    { id: 'tuesday', label: 'Tue' },
    { id: 'wednesday', label: 'Wed' },
    { id: 'thursday', label: 'Thu' },
    { id: 'friday', label: 'Fri' },
    { id: 'saturday', label: 'Sat' },
    { id: 'sunday', label: 'Sun' },
  ];

  const toggleDepartment = (id: string) => {
    setDepartments(prev =>
      prev.map(dept =>
        dept.id === id ? { ...dept, enabled: !dept.enabled } : dept
      )
    );
  };

  const toggleWorkingDay = (day: string) => {
    setWorkingHours(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  const handleSubmit = async () => {
    if (!hospital?.id) {
      toast({
        title: 'Error',
        description: 'Hospital not found',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const settings = {
        departments: departments.filter(d => d.enabled).map(d => d.id),
        workingHours: {
          open: workingHours.openTime,
          close: workingHours.closeTime,
          days: workingHours.workingDays,
        },
        specializations: additionalInfo.specializations.split(',').map(s => s.trim()).filter(Boolean),
        description: additionalInfo.description,
        setupCompleted: true,
      };

      const { error } = await supabase
        .from('hospitals')
        .update({ settings })
        .eq('id', hospital.id);

      if (error) throw error;

      toast({
        title: 'Setup Complete!',
        description: 'Your hospital profile has been configured successfully.',
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Configure Your Hospital</h1>
          <p className="text-muted-foreground">
            Set up your hospital's departments, working hours, and other details.
            You can always change these later in settings.
          </p>
        </div>

        {/* Departments Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Departments
            </CardTitle>
            <CardDescription>
              Select the departments available in your hospital
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => toggleDepartment(dept.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    dept.enabled
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      dept.enabled ? 'bg-primary/10' : 'bg-muted'
                    }`}
                  >
                    <dept.icon
                      className={`h-5 w-5 ${
                        dept.enabled ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <span
                    className={`font-medium ${
                      dept.enabled ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {dept.name}
                  </span>
                  {dept.enabled && (
                    <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Working Hours Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Working Hours
            </CardTitle>
            <CardDescription>
              Set your hospital's operating hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="openTime">Opening Time</Label>
                <Input
                  id="openTime"
                  type="time"
                  value={workingHours.openTime}
                  onChange={(e) =>
                    setWorkingHours(prev => ({ ...prev, openTime: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closeTime">Closing Time</Label>
                <Input
                  id="closeTime"
                  type="time"
                  value={workingHours.closeTime}
                  onChange={(e) =>
                    setWorkingHours(prev => ({ ...prev, closeTime: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Working Days</Label>
              <div className="flex flex-wrap gap-2">
                {days.map((day) => (
                  <button
                    key={day.id}
                    onClick={() => toggleWorkingDay(day.id)}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                      workingHours.workingDays.includes(day.id)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Additional Information
            </CardTitle>
            <CardDescription>
              Optional details about your hospital
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="specializations">Specializations</Label>
              <Input
                id="specializations"
                placeholder="e.g., Cardiology, Pediatrics, Orthopedics (comma separated)"
                value={additionalInfo.specializations}
                onChange={(e) =>
                  setAdditionalInfo(prev => ({ ...prev, specializations: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Hospital Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of your hospital and services..."
                rows={3}
                value={additionalInfo.description}
                onChange={(e) =>
                  setAdditionalInfo(prev => ({ ...prev, description: e.target.value }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <Button variant="outline" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Complete Setup
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
