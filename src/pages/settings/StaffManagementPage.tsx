import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StaffInviteModal } from '@/components/staff/StaffInviteModal';
import { useStaffInvitations, StaffInvitation } from '@/hooks/useStaffInvitations';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Mail,
  RefreshCw,
  XCircle,
  Users,
  Clock,
  CheckCircle2,
  Loader2,
  Edit,
  UserX,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { EditStaffModal } from '@/components/staff/EditStaffModal';
import { DeactivateStaffDialog } from '@/components/staff/DeactivateStaffDialog';
import { UserRole } from '@/types/auth';
import { format, formatDistanceToNow } from 'date-fns';

interface StaffMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  roles: UserRole[];
  created_at: string;
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrator',
  doctor: 'Doctor',
  nurse: 'Nurse',
  receptionist: 'Receptionist',
  pharmacist: 'Pharmacist',
  lab_technician: 'Lab Technician',
  patient: 'Patient',
};

const roleColors: Record<UserRole, string> = {
  admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  doctor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  nurse: 'bg-green-500/10 text-green-500 border-green-500/20',
  receptionist: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  pharmacist: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  lab_technician: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  patient: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const invitationStatusColors = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  accepted: 'bg-success/10 text-success border-success/20',
  expired: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function StaffManagementPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const {
    fetchInvitations,
    cancelInvitation,
    resendInvitation,
    isLoading: invitationsLoading,
  } = useStaffInvitations();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'staff' | 'invitations'>('staff');
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const getJoinLink = (token: string) => `${window.location.origin}/hospital/join/${token}`;

  const copyInviteLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(getJoinLink(token));
      setCopiedToken(token);
      toast({ title: 'Link copied!', description: 'Share this link with the staff member.' });
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (profile?.hospital_id) {
      loadStaffMembers();
      loadInvitations();
    }
  }, [profile?.hospital_id]);

  const loadStaffMembers = async () => {
    if (!profile?.hospital_id) return;

    setIsLoadingStaff(true);
    try {
      // Fetch profiles for the hospital
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('hospital_id', profile.hospital_id);

      if (profilesError) throw profilesError;

      // Fetch roles for all users
      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const staffWithRoles = (profiles || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        phone: p.phone,
        avatar_url: p.avatar_url,
        roles: (roles || [])
          .filter(r => r.user_id === p.user_id)
          .map(r => r.role as UserRole),
        created_at: p.created_at,
      }));

      setStaffMembers(staffWithRoles);
    } catch (error) {
      console.error('Error loading staff:', error);
      toast({
        title: 'Error',
        description: 'Failed to load staff members',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const loadInvitations = async () => {
    const data = await fetchInvitations();
    setInvitations(data);
  };

  const handleCancelInvitation = async (id: string) => {
    const result = await cancelInvitation(id);
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Invitation cancelled',
        description: 'The invitation has been cancelled',
      });
      loadInvitations();
    }
  };

  const handleResendInvitation = async (id: string) => {
    const result = await resendInvitation(id);
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Invitation resent',
        description: 'A new invitation has been sent',
      });
      loadInvitations();
    }
  };

  const filteredStaff = staffMembers.filter(
    member =>
      member.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInvitations = invitations.filter(
    inv => inv.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = invitations.filter(i => i.status === 'pending').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Staff Management</h1>
            <p className="text-muted-foreground">
              Manage your hospital staff and invitations
            </p>
          </div>
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Staff
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{staffMembers.length}</p>
              <p className="text-sm text-muted-foreground">Total Staff</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
            <div className="p-3 rounded-lg bg-warning/10">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending Invitations</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
            <div className="p-3 rounded-lg bg-success/10">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {invitations.filter(i => i.status === 'accepted').length}
              </p>
              <p className="text-sm text-muted-foreground">Accepted This Month</p>
            </div>
          </div>
        </div>

        {/* Tabs & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'staff' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('staff')}
            >
              <Users className="h-4 w-4 mr-2" />
              Staff ({staffMembers.length})
            </Button>
            <Button
              variant={activeTab === 'invitations' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('invitations')}
            >
              <Mail className="h-4 w-4 mr-2" />
              Invitations ({invitations.length})
            </Button>
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Content */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {activeTab === 'staff' ? (
            isLoadingStaff ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No staff members found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.first_name} {member.last_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.roles.map((role) => (
                            <Badge
                              key={role}
                              variant="outline"
                              className={roleColors[role]}
                            >
                              {roleLabels[role]}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(member.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStaff(member);
                                setEditModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStaff(member);
                                setDeactivateDialogOpen(true);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : invitationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredInvitations.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No invitations found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">
                      {invitation.email}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={roleColors[invitation.role]}
                      >
                        {roleLabels[invitation.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={invitationStatusColors[invitation.status]}
                      >
                        {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {invitation.status === 'pending' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => copyInviteLink(invitation.token)}
                            >
                              {copiedToken === invitation.token ? (
                                <Check className="h-4 w-4 mr-2 text-success" />
                              ) : (
                                <Copy className="h-4 w-4 mr-2" />
                              )}
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => window.open(getJoinLink(invitation.token), '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open Link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleResendInvitation(invitation.id)}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Resend
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCancelInvitation(invitation.id)}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <StaffInviteModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        onSuccess={() => loadInvitations()}
      />

      <EditStaffModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        staff={selectedStaff}
        onSuccess={loadStaffMembers}
      />

      <DeactivateStaffDialog
        open={deactivateDialogOpen}
        onOpenChange={setDeactivateDialogOpen}
        staff={selectedStaff}
        onSuccess={loadStaffMembers}
      />
    </DashboardLayout>
  );
}
