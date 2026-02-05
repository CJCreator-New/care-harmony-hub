import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStaffInvitations } from '@/hooks/useStaffInvitations';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types/auth';
import { getRoleLabel } from '@/types/rbac';
import { Loader2, Mail, UserPlus, Copy, Check, ExternalLink } from 'lucide-react';

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'] as const),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface StaffInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const roleDescriptions: Record<string, string> = {
  doctor: 'Can manage consultations, prescriptions, and patient care',
  nurse: 'Can record vitals, assist consultations, and manage queue',
  receptionist: 'Can manage appointments, check-ins, and billing',
  pharmacist: 'Can dispense medications and manage inventory',
  lab_technician: 'Can process lab orders and upload results',
};

export function StaffInviteModal({ open, onOpenChange, onSuccess }: StaffInviteModalProps) {
  const { createInvitation, isLoading } = useStaffInvitations();
  const { logActivity } = useActivityLog();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [inviteSuccess, setInviteSuccess] = useState<{ email: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: undefined,
    },
  });

  const getJoinLink = (token: string) => `${window.location.origin}/hospital/join/${token}`;

  const copyToClipboard = async (token: string) => {
    try {
      await navigator.clipboard.writeText(getJoinLink(token));
      setCopied(true);
      toast({ title: 'Link copied!', description: 'Share this link with the staff member.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', description: 'Please copy the link manually.', variant: 'destructive' });
    }
  };

  const onSubmit = async (data: InviteFormData) => {
    const result = await createInvitation({
      email: data.email,
      role: data.role as UserRole,
    });

    if (result.error) {
      toast({
        title: 'Failed to send invitation',
        description: result.error,
        variant: 'destructive',
      });
      return;
    }

    // Log activity
    logActivity({
      actionType: 'staff_invite',
      entityType: 'staff_invitation',
      entityId: result.data?.id,
      details: { email: data.email, role: data.role },
    });

    setInviteSuccess({ email: data.email, token: result.data?.token || '' });
    onSuccess?.();
  };

  const handleClose = () => {
    form.reset();
    setSelectedRole('');
    setInviteSuccess(null);
    setCopied(false);
    onOpenChange(false);
  };

  const handleInviteAnother = () => {
    form.reset();
    setSelectedRole('');
    setInviteSuccess(null);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {inviteSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-success" />
                Invitation Sent!
              </DialogTitle>
              <DialogDescription>
                Share this link with <strong>{inviteSuccess.email}</strong> to join your hospital.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={getJoinLink(inviteSuccess.token)}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(inviteSuccess.token)}
                >
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(getJoinLink(inviteSuccess.token), '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Join Page
              </Button>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleInviteAnother}>
                Invite Another
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Invite Staff Member
              </DialogTitle>
              <DialogDescription>
                Send an invitation to add a new staff member to your hospital.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="email"
                            placeholder="staff@example.com"
                            className="pl-10"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedRole(value);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="doctor">{getRoleLabel('doctor')}</SelectItem>
                          <SelectItem value="nurse">{getRoleLabel('nurse')}</SelectItem>
                          <SelectItem value="receptionist">{getRoleLabel('receptionist')}</SelectItem>
                          <SelectItem value="pharmacist">{getRoleLabel('pharmacist')}</SelectItem>
                          <SelectItem value="lab_technician">{getRoleLabel('lab_technician')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedRole && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    {roleDescriptions[selectedRole]}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Invitation
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
