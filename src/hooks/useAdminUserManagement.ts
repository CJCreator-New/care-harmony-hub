// Admin User Management Hook
import { useState, useCallback } from 'react';
import { AdminUser, UserManagementData } from '@/types/admin';
import { UserRole } from '@/types/auth';
import { AdminUserManagementService } from '@/utils/adminUserManagementService';

export function useAdminUserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = useCallback(async (limit: number = 50, offset: number = 0) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await AdminUserManagementService.getUsers(limit, offset);

      if (fetchError) throw fetchError;

      setUsers(data?.users || []);
      return data;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createUser = useCallback(
    async (email: string, role: UserRole, firstName: string, lastName: string, department?: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const { user, error: createError } = await AdminUserManagementService.createUser(
          email,
          role,
          firstName,
          lastName,
          department
        );

        if (createError) throw createError;

        if (user) {
          setUsers([...users, user]);
        }

        return user;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [users]
  );

  const updateUser = useCallback(
    async (userId: string, updates: Partial<AdminUser>) => {
      try {
        setIsLoading(true);
        setError(null);

        const { user, error: updateError } = await AdminUserManagementService.updateUser(userId, updates);

        if (updateError) throw updateError;

        setUsers(users.map(u => (u.id === userId ? { ...u, ...updates } : u)));

        return user;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [users]
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const { error: deleteError } = await AdminUserManagementService.deleteUser(userId);

        if (deleteError) throw deleteError;

        setUsers(users.filter(u => u.id !== userId));
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [users]
  );

  const assignRole = useCallback(
    async (userId: string, role: UserRole) => {
      try {
        setIsLoading(true);
        setError(null);

        const { error: assignError } = await AdminUserManagementService.assignRole(userId, role);

        if (assignError) throw assignError;

        setUsers(users.map(u => (u.id === userId ? { ...u, role } : u)));
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [users]
  );

  const suspendUser = useCallback(
    async (userId: string, reason: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const { error: suspendError } = await AdminUserManagementService.suspendUser(userId, reason);

        if (suspendError) throw suspendError;

        setUsers(users.map(u => (u.id === userId ? { ...u, status: 'suspended' } : u)));
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [users]
  );

  const resetPassword = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const { tempPassword, error: resetError } = await AdminUserManagementService.resetPassword(userId);

      if (resetError) throw resetError;

      return tempPassword;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    users,
    isLoading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    assignRole,
    suspendUser,
    resetPassword,
  };
}
