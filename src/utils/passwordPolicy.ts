import { supabase } from '@/integrations/supabase/client';

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  preventReuseCount: number;
  maxAgeDays: number;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

class PasswordPolicyManager {
  private static instance: PasswordPolicyManager;

  static getInstance(): PasswordPolicyManager {
    if (!PasswordPolicyManager.instance) {
      PasswordPolicyManager.instance = new PasswordPolicyManager();
    }
    return PasswordPolicyManager.instance;
  }

  // Get password policy for a hospital
  async getPasswordPolicy(hospitalId?: string): Promise<PasswordPolicy> {
    try {
      if (!hospitalId) {
        // Return default policy
        return {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: true,
          preventReuseCount: 5,
          maxAgeDays: 90,
        };
      }

      const { data, error } = await supabase
        .from('password_policies')
        .select('*')
        .eq('hospital_id', hospitalId)
        .single();

      if (error || !data) {
        // Return default policy if no hospital-specific policy exists
        return {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: true,
          preventReuseCount: 5,
          maxAgeDays: 90,
        };
      }

      return {
        minLength: data.min_length,
        requireUppercase: data.require_uppercase,
        requireLowercase: data.require_lowercase,
        requireNumbers: data.require_numbers,
        requireSymbols: data.require_symbols,
        preventReuseCount: data.prevent_reuse_count,
        maxAgeDays: data.max_age_days,
      };
    } catch (error) {
      console.error('Error fetching password policy:', error);
      return {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true,
        preventReuseCount: 5,
        maxAgeDays: 90,
      };
    }
  }

  // Validate password against policy
  async validatePassword(password: string, hospitalId?: string): Promise<PasswordValidationResult> {
    const policy = await this.getPasswordPolicy(hospitalId);
    const errors: string[] = [];

    // Check minimum length
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    // Check character requirements
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common. Please choose a stronger password');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Check if password was recently used
  async checkPasswordReuse(userId: string, passwordHash: string, hospitalId?: string): Promise<boolean> {
    try {
      const policy = await this.getPasswordPolicy(hospitalId);

      // This would require storing password history hashes
      // For now, return true (not recently used)
      // In a full implementation, you'd check against a password_history table

      return false; // Not recently used
    } catch (error) {
      console.error('Error checking password reuse:', error);
      return false;
    }
  }

  // Update password policy for a hospital
  async updatePasswordPolicy(hospitalId: string, policy: Partial<PasswordPolicy>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('password_policies')
        .upsert({
          hospital_id: hospitalId,
          min_length: policy.minLength,
          require_uppercase: policy.requireUppercase,
          require_lowercase: policy.requireLowercase,
          require_numbers: policy.requireNumbers,
          require_symbols: policy.requireSymbols,
          prevent_reuse_count: policy.preventReuseCount,
          max_age_days: policy.maxAgeDays,
        }, {
          onConflict: 'hospital_id'
        });

      if (error) {
        console.error('Error updating password policy:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating password policy:', error);
      return false;
    }
  }

  // Generate a secure password suggestion
  generateSecurePassword(length: number = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let password = '';

    // Ensure at least one of each required character type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    const allChars = uppercase + lowercase + numbers + symbols;
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

export const passwordPolicyManager = PasswordPolicyManager.getInstance();