// Supabase Edge Function: generate-2fa-secret
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { TOTP, URI } from 'https://deno.land/x/otpauth@9.0.2/mod.ts';

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

    // Create TOTP instance
    const totp = new TOTP({
      issuer: issuer,
      label: email,
      secret: secretBase32,
      digits: 6,
      period: 30,
    });

    // Generate QR code URI
    const uri = new URI({
      protocol: 'otpauth',
      type: 'totp',
      issuer: issuer,
      label: email,
      secret: secretBase32,
    });

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
