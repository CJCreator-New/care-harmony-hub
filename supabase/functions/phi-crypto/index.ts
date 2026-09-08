/**
 * Edge Function: PHI Crypto (server-side field encryption)
 *
 * Purpose: Perform AES-256-GCM encrypt/decrypt of PHI fields using a key that
 * lives ONLY on the server (PHI_ENCRYPTION_KEY). This replaces the previous
 * client-side encryption, where the key was shipped in the JS bundle and was
 * therefore trivially extractable (HIPAA §164.312(a)(2)(iv) violation).
 *
 * Security:
 * - Requires a valid authenticated user (JWT verified via Supabase auth).
 * - Key is never returned to the client; only ciphertext/plaintext crosses the wire.
 * - Fails CLOSED: if PHI_ENCRYPTION_KEY is not configured, the function errors
 *   rather than falling back to a default/derivable key.
 *
 * Request body:
 *   { action: "encrypt", values: string[] }            -> { results: EncryptedData[] }
 *   { action: "decrypt", items: EncryptedData[] }       -> { results: string[] }
 *
 * EncryptedData = { encrypted: base64, iv: base64, keyVersion: string }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface EncryptedData {
  encrypted: string;
  iv: string;
  keyVersion: string;
}

const KEY_VERSION = "v1";
const PBKDF2_SALT = "care-sync-salt";
const PBKDF2_ITERATIONS = 100000;

let cachedKey: CryptoKey | null = null;

/** Derive (and cache) the AES-GCM key from the server-only secret. Fails closed. */
async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const secret = Deno.env.get("PHI_ENCRYPTION_KEY");
  if (!secret || secret.length < 16) {
    throw new Error(
      "PHI_ENCRYPTION_KEY is not configured (or too short). Refusing to encrypt/decrypt PHI.",
    );
  }

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  cachedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(PBKDF2_SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  return cachedKey;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function encryptValue(value: string, key: CryptoKey): Promise<EncryptedData> {
  if (!value) return { encrypted: "", iv: "", keyVersion: KEY_VERSION };

  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value),
  );

  return {
    encrypted: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
    keyVersion: KEY_VERSION,
  };
}

async function decryptValue(item: EncryptedData, key: CryptoKey): Promise<string> {
  if (!item?.encrypted) return "";

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(item.iv) },
    key,
    fromBase64(item.encrypted),
  );

  return new TextDecoder().decode(plaintext);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (status: number, payload: Record<string, unknown>) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ── AuthN: any authenticated user may encrypt/decrypt their own PHI fields ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Missing authorization header" });

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: authError } = await adminClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return json(401, { error: "Unauthorized" });

    const body = await req.json().catch(() => null);
    if (!body || (body.action !== "encrypt" && body.action !== "decrypt")) {
      return json(400, { error: "action must be 'encrypt' or 'decrypt'" });
    }

    const key = await getKey();

    if (body.action === "encrypt") {
      const values: unknown = body.values;
      if (!Array.isArray(values) || values.some((v) => typeof v !== "string")) {
        return json(400, { error: "values must be an array of strings" });
      }
      const results = await Promise.all(
        (values as string[]).map((v) => encryptValue(v, key)),
      );
      return json(200, { results });
    }

    // decrypt
    const items: unknown = body.items;
    if (!Array.isArray(items)) {
      return json(400, { error: "items must be an array of EncryptedData" });
    }
    const results = await Promise.all(
      (items as EncryptedData[]).map((it) => decryptValue(it, key)),
    );
    return json(200, { results });
  } catch (err) {
    // Never leak key/crypto internals to the client.
    console.error("phi-crypto error:", err instanceof Error ? err.message : String(err));
    return json(500, { error: "PHI crypto operation failed" });
  }
});
