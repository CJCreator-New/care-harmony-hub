// Admin User Management Service
import { supabase } from '@/integrations/supabase/client';
import { AdminUser, UserManagementData } from '@/types/admin';
import { UserRole } from '@/types/auth';
import { AdminRBACManager } from './adminRBACManager';

export class AdminUserManagementService {
  static async createUser(
    email: string,
    role: UserRole,
    firstName: string,
    lastName: string,
    department?: string
  ): Promise<{ user?: AdminUser; error?: Error }> {
    try {
      // Generate temporary password
      const tempPassword = this.generateTemporaryPassword();

      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role,
          department,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          email,
        });

      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role,
          hospital_id: (await supabase.auth.getSession()).data.session?.user.user_metadata?.hospital_id,
        });

      if (roleError) throw roleError;

      // Log audit event
      await this.logAuditEvent('USER_CREATED', 'user', authData.user.id, {
        email,
        role,
        department,
      });

      return {
        user: {
          id: authData.user.id,
          email,
          role,
          department,
          permissions: [],
          status: 'active',
          createdAt: new Date(),
          twoFactorEnabled: false,
        },
      };
    } catch (error) {
      return { error: error as Error };
    }
  }

  static async updateUser(
    userId: string,
    updates: Partial<AdminUser>
  ): Promise<{ user?: AdminUser; error?: Error }> {
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: updates.email?.split('@')[0],
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Update role if provided
      if (updates.role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: updates.role })
          .eq('user_id', userId);

        if (roleError) throw roleError;
      }

      // Log audit event
      await this.logAuditEvent('USER_UPDATED', 'user', userId, updates);

      return { user: updates as AdminUser };
    } catch (error) {
      return { error: error as Error };
    }
  }

  static async deleteUser(userId: string): Promise<{ error?: Error }> {
    try {
      // Delete user via Supabase Auth
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      // Log audit event
      await this.logAuditEvent('USER_DELETED', 'user', userId, {});

      return {};
    } catch (error) {
      return { error: error as Error };
    }
  }

  static async assignRole(userId: string, role: UserRole): Promise<{ error?: Error }> {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

      if (error) throw error;

      // Log audit event
      await this.logAuditEvent('ROLE_ASSIGNED', 'user', userId, { role });

      return {};
    } catch (error) {
      return { error: error as Error };
    }
  }

  static async suspendUser(userId: string, reason: string): Promise<{ error?: Error }> {
    try {
      // Update user status
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'suspended' })
        .eq('user_id', userId);

      if (error) throw error;

      // Log audit event
      await this.logAuditEvent('USER_SUSPENDED', 'user', userId, { reason });

      return {};
    } catch (error) {
      return { error: error as Error };
    }
  }

  static async resetPassword(userId: string): Promise<{ tempPassword?: string; error?: Error }> {
    try {
      const tempPassword = this.generateTemporaryPassword();

      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: tempPassword,
      });

      if (error) throw error;

      // Log audit event
      await this.logAuditEvent('PASSWORD_RESET', 'user', userId, {});

      return { tempPassword };
    } catch (error) {
      return { error: error as Error };
    }
  }

  static async getUsers(limit: number = 50, offset: number = 0): Promise<{ data?: UserManagementData; error?: Error }> {
    try {
      const { data: users, error, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const activeUsers = users?.filter(u => u.status === 'active').length || 0;
      const suspendedUsers = users?.filter(u => u.status === 'suspended').length || 0;

      return {
        data: {
          users: (users || []) as AdminUser[],
          totalUsers: count || 0,
          activeUsers,
          suspendedUsers,
        },
      };
    } catch (error) {
      return { error: error as Error };
    }
  }

  static async getUserById(userId: string): Promise<{ user?: AdminUser; error?: Error }> {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) throw rolesError;

      return {
        user: {
          id: userId,
          email: profile.email,
          role: roles?.[0]?.role || 'patient',
          permissions: [],
          status: profile.status || 'active',
          createdAt: new Date(profile.created_at),
          twoFactorEnabled: profile.two_factor_enabled || false,
        },
      };
    } catch (error) {
      return { error: error as Error };
    }
  }

  private static generateTemporaryPassword(): string {
    const length = 12;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  private static async logAuditEvent(
    action: string,
    resource: string,
    resourceId: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      await supabase.from('audit_logs').insert({
        user_id: session.session.user.id,
        action,
        resource,
        resource_id: resourceId,
        details,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
}
