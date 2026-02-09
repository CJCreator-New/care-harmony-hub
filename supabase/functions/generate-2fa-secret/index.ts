// Supabase Edge Function: generate-2fa-secret
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getIdentifier } from '../_shared/rateLimit.ts';

// Native TOTP URI generation
function generateTOTPURI(issuer: string, label: string, secret: string): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedLabel = encodeURIComponent(label);
  const params = `secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  return `otpauth://totp/${encodedIssuer}:${encodedLabel}?${params}`;
}

// Rate limit store for 2FA secret generation
const rateLimitStore: Record<string, { count: number; resetTime: number }> = {};

function checkRateLimit(req: Request): { allowed: boolean; remaining: number; resetTime: number } {
  const id = getIdentifier(req);
  const now = Date.now();
  const windowMs = 3600000; // 1 hour
  const maxAttempts = 3; // Only 3 2FA setups per hour
  
  // Clean up expired entries
  if (rateLimitStore[id]?.resetTime < now) {
    delete rateLimitStore[id];
  }
  
  if (!rateLimitStore[id]) {
    rateLimitStore[id] = { count: 0, resetTime: now + windowMs };
  }
  
  const current = rateLimitStore[id];
  if (current.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }
  
  current.count++;
  return { allowed: true, remaining: maxAttempts - current.count, resetTime: current.resetTime };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Check rate limit for 2FA secret generation
    const rateLimitResult = checkRateLimit(req);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many 2FA setup attempts. Please try again later.' }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000))
          } 
        }
      );
    }

    const { email, issuer = 'CareSync HMS' } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate a random secret (32 bytes = 256 bits)
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const secretBase32 = btoa(String.fromCharCode(...secret))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Create TOTP instance (not needed for URI generation, but keeping for compatibility)
    // Generate QR code URI using native function
    const uri = generateTOTPURI(issuer, email, secretBase32);

    // Generate backup codes (8 codes, each 8 characters)
    const backupCodes = Array.from({ length: 8 }, () =>
      Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(36))
        .join('')
        .toUpperCase()
        .substring(0, 8)
    );

    return new Response(
      JSON.stringify({
        secret: secretBase32,
        qrCodeUri: uri.toString(),
        backupCodes
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
