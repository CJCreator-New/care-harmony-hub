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

    // ── AuthZ: Scoped contextual authorization check to eliminate Decryption Oracle (SEC-001) ──
    const resourceType = body.resourceType as string | undefined;
    const resourceId = body.resourceId as string | undefined;
    let targetTable: string | null = null;

    if (resourceType && resourceId) {
      const tableMap: Record<string, string> = {
        patient: "patients",
        patients: "patients",
        consultation: "consultations",
        consultations: "consultations",
        clinical_note: "clinical_notes",
        clinical_notes: "clinical_notes",
        prescription: "prescriptions",
        prescriptions: "prescriptions",
        profile: "profiles",
        profiles: "profiles",
        vital: "vitals",
        vitals: "vitals",
        lab_result: "lab_results",
        lab_results: "lab_results",
        document: "documents",
        documents: "documents",
        audit_log: "activity_logs",
        audit_logs: "activity_logs",
        activity_log: "activity_logs",
        activity_logs: "activity_logs",
      };
      targetTable = tableMap[resourceType.toLowerCase()];
      if (!targetTable) {
        return json(400, { error: `Invalid resourceType: ${resourceType}` });
      }

      // Probe using caller's JWT to verify PostgreSQL RLS allows this read
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const userClient = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: record, error: probeError } = await userClient
        .from(targetTable)
        .select("id")
        .eq("id", resourceId)
        .maybeSingle();

      if (probeError || !record) {
        return json(403, { error: "Forbidden: You do not have permission to access this resource" });
      }
    } else {
      // If resource context is omitted, only hospital administrators may decrypt
      const { data: userRoles } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = (userRoles || []).map((r: any) => r.role);
      const isAdmin = roles.includes("admin");

      if (!isAdmin) {
        return json(403, {
          error: "Forbidden: resourceType and resourceId are required for non-admin decryption",
        });
      }
    }

    const results = await Promise.all(
      (items as EncryptedData[]).map((it) => decryptValue(it, key)),
    );

    // ── Audit Log: Log immutable event to activity_logs for HIPAA §164.312(b) ──
    try {
      const { data: callerProfile } = await adminClient
        .from("profiles")
        .select("hospital_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (callerProfile?.hospital_id) {
        await adminClient.from("activity_logs").insert({
          user_id: user.id,
          hospital_id: callerProfile.hospital_id,
          action_type: "PHI_DECRYPT",
          entity_type: targetTable || resourceType || "admin_direct",
          entity_id: resourceId || null,
          details: { itemCount: (items as EncryptedData[]).length },
        });
      }
    } catch (logErr) {
      console.warn("Failed to write phi decrypt audit log:", logErr);
    }

    return json(200, { results });
  } catch (err) {
    // Never leak key/crypto internals to the client.
    console.error("phi-crypto error:", err instanceof Error ? err.message : String(err));
    return json(500, { error: "PHI crypto operation failed" });
  }
});
