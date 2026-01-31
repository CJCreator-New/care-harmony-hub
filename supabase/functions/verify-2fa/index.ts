// Supabase Edge Function: verify-2fa
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { TOTP } from 'https://deno.land/x/otpauth@9.0.2/mod.ts';
import { rateLimit, getIdentifier } from '../_shared/rateLimit.ts';

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
    // Check rate limit for 2FA verification
    const rateLimitResult = checkRateLimit(req);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many verification attempts. Please try again later.' }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000))
          } 
        }
      );
    }

    const { secret, code } = await req.json();

    if (!secret || !code) {
      return new Response(
        JSON.stringify({ error: 'Secret and code are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
          'Access-Control-Allow-Origin': '*',
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
