import { supabase } from '@/integrations/supabase/client';

export interface BiometricCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  createdAt: string;
  lastUsedAt?: string;
}

export interface BiometricChallenge {
  challenge: string;
  timeout: number;
  rpId: string;
  userVerification: 'required' | 'preferred' | 'discouraged';
}

class BiometricAuthManager {
  private static instance: BiometricAuthManager;

  static getInstance(): BiometricAuthManager {
    if (!BiometricAuthManager.instance) {
      BiometricAuthManager.instance = new BiometricAuthManager();
    }
    return BiometricAuthManager.instance;
  }

  // Check if biometric authentication is available
  isBiometricAvailable(): boolean {
    return typeof window !== 'undefined' &&
           !!window.PublicKeyCredential &&
           typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
  }

  // Check if platform authenticator is available
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isBiometricAvailable()) {
      return false;
    }

    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      console.error('Error checking platform authenticator:', error);
      return false;
    }
  }

  // Generate a random challenge for WebAuthn
  private generateChallenge(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  // Register a new biometric credential
  async registerBiometricCredential(userId: string, userName: string, userDisplayName: string): Promise<boolean> {
    try {
      if (!this.isBiometricAvailable()) {
        throw new Error('Biometric authentication is not available');
      }

      // Create credential creation options
      const challenge = this.generateChallenge();
      const userIdBytes = new TextEncoder().encode(userId);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
        rp: {
          name: 'CareSync HIMS',
          id: window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: userName,
          displayName: userDisplayName,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: 'direct',
      };

      // Create the credential
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create biometric credential');
      }

      // Extract credential data
      const response = credential.response as AuthenticatorAttestationResponse;
      const publicKey = btoa(String.fromCharCode(...new Uint8Array(response.getPublicKey())));
      const transports = response.getTransports?.() || [];

      // Store the credential in the database
      const { error } = await supabase
        .from('biometric_credentials')
        .insert({
          user_id: userId,
          credential_id: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
          public_key: publicKey,
          counter: 0,
          transports: transports,
        });

      if (error) {
        console.error('Error storing biometric credential:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error registering biometric credential:', error);
      return false;
    }
  }

  // Authenticate using biometric credential
  async authenticateWithBiometric(userId: string): Promise<boolean> {
    try {
      if (!this.isBiometricAvailable()) {
        throw new Error('Biometric authentication is not available');
      }

      // Get user's registered credentials
      const { data: credentials, error } = await supabase
        .from('biometric_credentials')
        .select('*')
        .eq('user_id', userId);

      if (error || !credentials || credentials.length === 0) {
        throw new Error('No biometric credentials found');
      }

      // Create credential request options
      const challenge = this.generateChallenge();
      const allowCredentials = credentials.map(cred => ({
        type: 'public-key' as const,
        id: Uint8Array.from(atob(cred.credential_id), c => c.charCodeAt(0)),
        transports: cred.transports || [],
      }));

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
        allowCredentials,
        timeout: 60000,
        userVerification: 'required',
      };

      // Get the credential
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Biometric authentication failed');
      }

      // Verify the credential (in a real implementation, you'd verify this on the server)
      const response = credential.response as AuthenticatorAssertionResponse;
      const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));

      // Update last used timestamp
      await supabase
        .from('biometric_credentials')
        .update({ last_used_at: new Date().toISOString() })
        .eq('credential_id', credentialId);

      return true;
    } catch (error) {
      console.error('Error authenticating with biometric:', error);
      return false;
    }
  }

  // Get user's biometric credentials
  async getBiometricCredentials(userId: string): Promise<BiometricCredential[]> {
    try {
      const { data, error } = await supabase
        .from('biometric_credentials')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching biometric credentials:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching biometric credentials:', error);
      return [];
    }
  }

  // Remove a biometric credential
  async removeBiometricCredential(credentialId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('biometric_credentials')
        .delete()
        .eq('credential_id', credentialId);

      if (error) {
        console.error('Error removing biometric credential:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error removing biometric credential:', error);
      return false;
    }
  }

  // Check if user has biometric authentication enabled
  async hasBiometricEnabled(userId: string): Promise<boolean> {
    try {
      const credentials = await this.getBiometricCredentials(userId);
      return credentials.length > 0;
    } catch (error) {
      console.error('Error checking biometric status:', error);
      return false;
    }
  }
}

export const biometricAuthManager = BiometricAuthManager.getInstance();