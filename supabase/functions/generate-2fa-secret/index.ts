// Supabase Edge Function: generate-2fa-secret
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getIdentifier, withRateLimit } from '../_shared/rateLimit.ts';
import { getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';
import { validateRequest } from '../_shared/validation.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const generate2faSchema = z.object({
  email: z.string().email(),
  issuer: z.string().default('CareSync HMS'),
});

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

const handler = async (req: Request): Promise<Response> => {
  const reqCorsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: reqCorsHeaders,
    });
  }

  if (!isOriginAllowed(req)) {
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { 'Content-Type': 'application/json', ...reqCorsHeaders } }
    );
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
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
            ...reqCorsHeaders
          } 
        }
      );
    }

    const validation = await validateRequest(req, generate2faSchema);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...reqCorsHeaders } }
      );
    }
    const { email, issuer = 'CareSync HMS' } = validation.data;

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
          ...reqCorsHeaders,
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...reqCorsHeaders } }
    );
  }
};

serve((req) => withRateLimit(req, handler, { maxRequests: 5, windowMs: 300000 }));
