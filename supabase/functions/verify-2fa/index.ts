// Supabase Edge Function: verify-2fa
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { TOTP } from 'https://deno.land/x/otpauth@9.0.2/mod.ts';
import { rateLimit, getIdentifier } from '../_shared/rateLimit.ts';
import { getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';

// Rate limit store for 2FA verification
const rateLimitStore: Record<string, { count: number; resetTime: number }> = {};

function checkRateLimit(req: Request): { allowed: boolean; remaining: number; resetTime: number } {
  const id = getIdentifier(req);
  const now = Date.now();
  const windowMs = 300000; // 5 minutes
  const maxAttempts = 5;
  
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
  const reqCorsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
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
    // Check rate limit for 2FA verification
    const rateLimitResult = checkRateLimit(req);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many verification attempts. Please try again later.' }),
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

    const { secret, code } = await req.json();

    if (!secret || !code) {
      return new Response(
        JSON.stringify({ error: 'Secret and code are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...reqCorsHeaders } }
      );
    }

    // Create TOTP instance
    const totp = new TOTP({
      secret: secret,
      digits: 6,
      period: 30,
    });

    // Verify the code
    const valid = totp.validate({ token: code, window: 1 }) !== null;

    return new Response(
      JSON.stringify({ valid }),
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
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...reqCorsHeaders } }
    );
  }
});
