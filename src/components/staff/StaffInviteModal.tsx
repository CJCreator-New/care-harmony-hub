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
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types/auth';
import { Loader2, Mail, UserPlus } from 'lucide-react';

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
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<string>('');

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: undefined,
    },
  });

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

    toast({
      title: 'Invitation sent',
      description: `An invitation has been sent to ${data.email}`,
    });

    form.reset();
    setSelectedRole('');
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="nurse">Nurse</SelectItem>
                      <SelectItem value="receptionist">Receptionist</SelectItem>
                      <SelectItem value="pharmacist">Pharmacist</SelectItem>
                      <SelectItem value="lab_technician">Lab Technician</SelectItem>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
