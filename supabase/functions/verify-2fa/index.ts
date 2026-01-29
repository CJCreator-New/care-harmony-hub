// Supabase Edge Function: verify-2fa
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { TOTP } from 'https://deno.land/x/otpauth@9.0.2/mod.ts';

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
