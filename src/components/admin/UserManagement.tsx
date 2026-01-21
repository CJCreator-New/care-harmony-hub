// User Management Component
import React, { useState } from 'react';
import { useAdminUserManagement } from '@/hooks/useAdminUserManagement';
import { AdminRBACManager } from '@/utils/adminRBACManager';
import { useAuth } from '@/contexts/AuthContext';
import { AdminPermission } from '@/types/admin';
import { UserRole } from '@/types/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus, Edit2, Trash2, Lock } from 'lucide-react';

export function UserManagement() {
  const { primaryRole } = useAuth();
  const { users, createUser, updateUser, deleteUser, assignRole, suspendUser, resetPassword, isLoading, error } = useAdminUserManagement();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'doctor' as UserRole,
    department: '',
  });

  // Check permissions
  const canCreateUsers = AdminRBACManager.hasPermission(primaryRole, AdminPermission.USER_CREATE);
  const canUpdateUsers = AdminRBACManager.hasPermission(primaryRole, AdminPermission.USER_UPDATE);
  const canDeleteUsers = AdminRBACManager.hasPermission(primaryRole, AdminPermission.USER_DELETE);
  const canAssignRoles = AdminRBACManager.hasPermission(primaryRole, AdminPermission.USER_ASSIGN_ROLE);

  if (!AdminRBACManager.hasPermission(primaryRole, AdminPermission.USER_READ)) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>You do not have permission to view users.</AlertDescription>
      </Alert>
    );
  }

  const handleCreateUser = async () => {
    try {
      await createUser(formData.email, formData.role, formData.firstName, formData.lastName, formData.department);
      setFormData({ email: '', firstName: '', lastName: '', role: 'doctor', department: '' });
      setIsCreateDialogOpen(false);
    } catch (err) {
      console.error('Failed to create user:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(userId);
      } catch (err) {
        console.error('Failed to delete user:', err);
      }
    }
  };

  const handleSuspendUser = async (userId: string) => {
    try {
      await suspendUser(userId, 'Suspended by admin');
    } catch (err) {
      console.error('Failed to suspend user:', err);
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const tempPassword = await resetPassword(userId);
      alert(`Temporary password: ${tempPassword}`);
    } catch (err) {
      console.error('Failed to reset password:', err);
    }
  };

  const getAccessibleRoles = () => {
    if (!primaryRole) return [];
    return AdminRBACManager.getAccessibleRoles(primaryRole);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-gray-600">Manage hospital staff and user accounts</p>
        </div>
        {canCreateUsers && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>Add a new staff member to the system</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="user@hospital.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">First Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Last Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    className="w-full px-3 py-2 border rounded"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  >
                    {getAccessibleRoles().map(role => (
                      <option key={role} value={role}>
                        {role.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department (Optional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded"
                    placeholder="Cardiology"
                    value={formData.department}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreateUser} className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>Total users: {users.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Email</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-left py-3 px-4">Department</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Created</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{user.email}</td>
                    <td className="py-3 px-4">-</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                        {user.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">{user.department || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {canUpdateUsers && (
                          <Button variant="ghost" size="sm" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {canAssignRoles && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Reset Password"
                            onClick={() => handleResetPassword(user.id)}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteUsers && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
