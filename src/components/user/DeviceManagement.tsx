import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Smartphone, Monitor, Tablet, Shield, ShieldOff, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { deviceManager } from '@/utils/deviceManager';
import { toast } from 'sonner';

interface UserDevice {
  id: string;
  device_id: string;
  device_name: string;
  device_type: string;
  browser_name?: string;
  browser_version?: string;
  os_name?: string;
  os_version?: string;
  ip_address?: string;
  is_trusted: boolean;
  last_seen_at: string;
  created_at: string;
}

export function DeviceManagement() {
  const { user, hospital } = useAuth();
  const queryClient = useQueryClient();
  const [revokingDevice, setRevokingDevice] = useState<string | null>(null);
  const hospitalId = hospital?.id;

  // Fetch user's devices
  const { data: devices, isLoading } = useQuery({
    queryKey: ['user-devices', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const devices = await deviceManager.getUserDevices(user.id);
      return devices;
    },
    enabled: !!user?.id,
  });

  // Toggle device trust mutation
  const toggleTrustMutation = useMutation({
    mutationFn: async ({ deviceId, isTrusted }: { deviceId: string; isTrusted: boolean }) => {
      return await deviceManager.toggleDeviceTrust(deviceId, isTrusted);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-devices'] });
      toast.success('Device trust status updated');
    },
    onError: (error) => {
      console.error('Error updating device trust:', error);
      toast.error('Failed to update device trust status');
    },
  });

  // Revoke device mutation
  const revokeDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return await deviceManager.revokeDevice(deviceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-devices'] });
      toast.success('Device access revoked');
      setRevokingDevice(null);
    },
    onError: (error) => {
      console.error('Error revoking device:', error);
      toast.error('Failed to revoke device access');
    },
  });

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
      case 'phone':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      case 'desktop':
      case 'laptop':
        return <Monitor className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getDeviceTypeLabel = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
      case 'phone':
        return 'Mobile';
      case 'tablet':
        return 'Tablet';
      case 'desktop':
      case 'laptop':
        return 'Desktop';
      default:
        return deviceType;
    }
  };

  const formatLastSeen = (lastSeenAt: string) => {
    const now = new Date();
    const lastSeen = new Date(lastSeenAt);
    const diffInHours = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Active now';
    if (diffInHours < 24) return `Active ${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `Active ${diffInDays}d ago`;
  };

  const handleToggleTrust = (deviceId: string, currentTrust: boolean) => {
    toggleTrustMutation.mutate({ deviceId, isTrusted: !currentTrust });
  };

  const handleRevokeDevice = (deviceId: string) => {
    setRevokingDevice(deviceId);
    revokeDeviceMutation.mutate(deviceId);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to manage your devices</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Device Management</h2>
        <p className="text-muted-foreground">
          Manage trusted devices and revoke access when needed
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Devices</CardTitle>
          <CardDescription>
            Devices that have accessed your CareSync account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading devices...</p>
            </div>
          ) : devices && devices.length > 0 ? (
            <div className="space-y-4">
              {devices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getDeviceIcon(device.device_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">{device.device_name}</p>
                        <Badge variant="outline">
                          {getDeviceTypeLabel(device.device_type)}
                        </Badge>
                        {device.is_trusted ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Trusted
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Untrusted
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {device.browser_name && device.browser_version && (
                          <span>{device.browser_name} {device.browser_version}</span>
                        )}
                        {device.os_name && (
                          <span className="ml-2">• {device.os_name} {device.os_version}</span>
                        )}
                        {device.ip_address && (
                          <span className="ml-2">• IP: {device.ip_address}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatLastSeen(device.last_seen_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleTrust(device.id, device.is_trusted)}
                      disabled={toggleTrustMutation.isPending}
                    >
                      {device.is_trusted ? (
                        <>
                          <ShieldOff className="h-4 w-4 mr-2" />
                          Untrust
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Trust
                        </>
                      )}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Revoke
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke Device Access</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to revoke access for this device? This will log out all sessions on this device and require re-authentication.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRevokeDevice(device.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Revoke Access
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No devices found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
          <CardDescription>
            Best practices for device security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Trust Only Known Devices</p>
                <p className="text-xs text-muted-foreground">
                  Only mark devices as trusted if you recognize them and regularly use them to access CareSync.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Regular Device Audits</p>
                <p className="text-xs text-muted-foreground">
                  Periodically review your trusted devices and revoke access for devices you no longer use.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Immediate Action on Suspicious Activity</p>
                <p className="text-xs text-muted-foreground">
                  If you notice unfamiliar devices or suspicious activity, revoke access immediately and change your password.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}