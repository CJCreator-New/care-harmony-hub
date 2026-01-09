import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTwoFactorAuth } from '@/hooks/useTwoFactorAuth';
import { TwoFactorSetupModal } from '@/components/auth/TwoFactorSetupModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Shield, ShieldCheck, ShieldX, User, Mail, Phone, MapPin, Building } from 'lucide-react';
import { toast } from 'sonner';

export function UserProfilePage() {
  const { profile, hospital, primaryRole } = useAuth();
  const { disable } = useTwoFactorAuth();
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const handleDisable2FA = async () => {
    setIsDisabling(true);
    const success = await disable();
    setIsDisabling(false);
    if (success) {
      toast.success('Two-factor authentication disabled');
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      admin: 'Administrator',
      doctor: 'Doctor',
      nurse: 'Nurse',
      receptionist: 'Receptionist',
      pharmacist: 'Pharmacist',
      lab_technician: 'Lab Technician',
      patient: 'Patient',
    };
    return roleLabels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const roleColors: Record<string, string> = {
      admin: 'destructive',
      doctor: 'default',
      nurse: 'secondary',
      receptionist: 'outline',
      pharmacist: 'default',
      lab_technician: 'secondary',
      patient: 'outline',
    };
    return roleColors[role] || 'default';
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Your personal and account information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20 border-4 border-primary/10">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                {getInitials(profile.first_name, profile.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {profile.first_name} {profile.last_name}
                </h3>
                {primaryRole && (
                  <Badge variant={getRoleColor(primaryRole) as any} className="mt-1">
                    {getRoleLabel(primaryRole)}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span>{profile.email}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{profile.phone}</span>
                  </div>
                )}
                {hospital && (
                  <div className="flex items-center gap-2 text-sm md:col-span-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Hospital:</span>
                    <span>{hospital.name}</span>
                  </div>
                )}
                {hospital?.address && (
                  <div className="flex items-center gap-2 text-sm md:col-span-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Address:</span>
                    <span>
                      {hospital.address}
                      {hospital.city && `, ${hospital.city}`}
                      {hospital.state && `, ${hospital.state}`}
                      {hospital.zip && ` ${hospital.zip}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Manage your account security and authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Two-Factor Authentication */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {profile.two_factor_enabled ? (
                  <ShieldCheck className="w-5 h-5 text-success" />
                ) : (
                  <ShieldX className="w-5 h-5 text-muted-foreground" />
                )}
                <h4 className="font-medium">Two-Factor Authentication</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {profile.two_factor_enabled
                  ? 'Two-factor authentication is enabled for your account'
                  : 'Add an extra layer of security to your account with 2FA'
                }
              </p>
            </div>
            <div className="flex gap-2">
              {profile.two_factor_enabled ? (
                <Button
                  variant="outline"
                  onClick={handleDisable2FA}
                  disabled={isDisabling}
                >
                  {isDisabling ? 'Disabling...' : 'Disable 2FA'}
                </Button>
              ) : (
                <Button onClick={() => setShowTwoFactorSetup(true)}>
                  Enable 2FA
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Password */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Password</h4>
              <p className="text-sm text-muted-foreground">
                Change your account password
              </p>
            </div>
            <Button variant="outline">
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Setup Modal */}
      <TwoFactorSetupModal
        open={showTwoFactorSetup}
        onOpenChange={setShowTwoFactorSetup}
        onSuccess={() => {
          // Refresh profile data to show updated 2FA status
          window.location.reload();
        }}
      />
    </div>
  );
}

export default UserProfilePage;