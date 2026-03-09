---
name: edge-function
description: 'Scaffolds Supabase Edge Functions with proper CORS, auth verification, and rate limiting for the CareSync HIMS. Use when asked to create a new edge function, add an endpoint, or wire up a server-side action. Produces a complete index.ts using the existing _shared/ helpers (cors.ts, authorize.ts, rateLimit.ts, validation.ts) and the correct Deno import style.'
argument-hint: 'Describe the function: name, HTTP action (POST/GET), which roles can call it, what it does, and any Supabase tables it reads/writes.'
---

# CareSync — Edge Function Scaffold Skill

Produces a complete, deployment-ready `supabase/functions/<name>/index.ts` using the existing `_shared/` helpers. Never reinvents CORS, auth, or rate limiting — always imports from `../_shared/`.

## When to Use

- "Create an edge function for [action]"
- "Add a server-side endpoint that [does X]"
- "Write an edge function that [role] can call to [action]"

---

## Existing `_shared/` Helpers — Always Use These

| Helper | Import | What it does |
|--------|--------|--------------|
| `getCorsHeaders(req)` | `../_shared/cors.ts` | Returns CORS headers scoped to `CORS_ALLOWED_ORIGINS` env var; handles `Vary: Origin` |
| `authorize(req, roles[])` | `../_shared/authorize.ts` | Verifies Bearer JWT via `auth.getUser()`, checks `user_roles` table (NOT JWT claims), returns `Response \| null` |
| `withRateLimit(req, handler, config?)` | `../_shared/rateLimit.ts` | Wraps handler with in-memory rate limiting; sets `X-RateLimit-Remaining` header |
| `getIdentifier(req)` | `../_shared/rateLimit.ts` | Extracts rate-limit key from auth header or `x-forwarded-for` |
| `validateRequest(req, schema)` | `../_shared/validation.ts` | Parses JSON body against a Zod schema; returns `{ success, data \| error }` |
| `validationErrorResponse(error)` | `../_shared/validation.ts` | Returns a 400 `Response` with `{ error: 'Validation failed', details }` |

**Rate limit presets** (from `rateLimit.ts`):
- `default`: 60 req / 60s
- `auth`: 5 req / 300s
- `ai`: 10 req / 60s

---

## Standard Function Template

```ts
// supabase/functions/<function-name>/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { authorize } from "../_shared/authorize.ts";
import { withRateLimit } from "../_shared/rateLimit.ts";
import { validateRequest, validationErrorResponse } from "../_shared/validation.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// --- Input schema ---
const requestSchema = z.object({
  // define fields here
});

// --- Handler ---
const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth — pass null to allow any authenticated user, or specify roles
  const authError = await authorize(req, ["doctor", "admin"]);
  if (authError) return authError;

  // Validate body
  const validation = await validateRequest(req, requestSchema);
  if (!validation.success) return validationErrorResponse(validation.error);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Business logic here ---
    const result = {};

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("[<function-name>]", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

// Wrap with rate limiting (choose preset: default | auth | ai)
serve((req) => withRateLimit(req, handler));
```

---

## Codebase-Specific Rules

| Rule | Reason |
|------|--------|
| Always use `getCorsHeaders(req)` — never hardcode `corsHeaders` object | `cors.ts` handles `CORS_ALLOWED_ORIGINS` env var and `Vary: Origin` correctly |
| Always use `authorize(req, roles)` from `_shared/` — never re-implement JWT verification | `authorize.ts` checks `user_roles` table, not JWT claims |
| `Deno.env.get(...)` directly — not `(globalThis as any).Deno.env.get(...)` | The cast is a legacy workaround; Deno 1.x supports direct access |
| Use `SUPABASE_SERVICE_ROLE_KEY` for the server-side client | Never use the anon key server-side |
| Wrap `serve()` with `withRateLimit` — not inline `rateLimit()` calls | `withRateLimit` sets `X-RateLimit-Remaining` header automatically |
| Profiles keyed on `user_id`, not `id` | `.eq("user_id", user.id)` in any profile lookup |
| All DB writes must include `hospital_id` | Multi-tenant isolation |
| Catch errors and return `500` with a generic message — never leak stack traces | Security + HIPAA |
| Add `console.error("[function-name]", err)` before returning 500 | Enables Supabase log monitoring |

---

## Role Values for `authorize()`

```ts
// Any single role or combination:
authorize(req, ["admin"])
authorize(req, ["doctor", "admin"])
authorize(req, ["nurse", "doctor", "admin"])
authorize(req, ["pharmacist"])
authorize(req, ["lab_technician"])
authorize(req, ["receptionist", "admin"])
authorize(req, ["patient"])   // patient-facing endpoints
```

---

## Output Checklist

- [ ] `getCorsHeaders(req)` used — not hardcoded object
- [ ] `OPTIONS` preflight returns `null` body with cors headers
- [ ] `authorize()` called before any business logic
- [ ] `validateRequest()` called with a Zod schema
- [ ] `SUPABASE_SERVICE_ROLE_KEY` used for server client
- [ ] `withRateLimit` wraps `serve()`
- [ ] All DB writes include `hospital_id`
- [ ] Error catch returns 500 with generic message + `console.error`
- [ ] No stack traces or internal details in error responses
