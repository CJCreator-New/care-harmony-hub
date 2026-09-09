# Production Secrets Management & Key Rotation Guide

## 1. Overview & Security Posture

This guide establishes the operational runbook for secrets rotation, credential hygiene, and environment configuration in **AroCord HIMS / Care Harmony Hub**.

### Golden Rules
1. **Never Commit Secrets**: No secrets, service role keys, or encryption keys in source control or `.env` files committed to Git.
2. **Never Prefix Secrets with `VITE_`**: Anything with `VITE_` is statically bundled into client-side JavaScript and trivially extractable by any end user.
3. **Fail-Closed on Secret Invalidation**: All edge functions and backend services fail closed if mandatory secrets (`SUPABASE_SERVICE_ROLE_KEY`, `PHI_ENCRYPTION_KEY`) are missing or malformed.

---

## 2. Immediate Post-Audit Key Rotation Procedure

Because legacy `.env` versions contained static development strings, the following keys must be regenerated before deploying to production:

### 2.1 Supabase Service Role Key & JWT Secret
1. Navigate to your Supabase project dashboard:
   `https://supabase.com/dashboard/project/<PROJECT_ID>/settings/api`
2. Under **Project API Keys**, locate **service_role (secret)**.
3. Click **Reset Service Role Key** (or use the CLI):
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<new-service-role-key>"
   ```
4. Update your CI/CD runner secrets (`GITHUB_SECRET: SUPABASE_SERVICE_ROLE_KEY`).
5. Verify edge functions can access the new service role key by invoking:
   ```bash
   supabase functions invoke monitoring
   ```

### 2.2 Server-Side PHI Encryption Key (`PHI_ENCRYPTION_KEY`)
The `phi-crypto` edge function uses AES-256-GCM for field-level encryption of sensitive patient identifiers.
1. Generate a cryptographically secure 256-bit (32-byte) hex key:
   ```bash
   # OpenSSL (macOS/Linux/WSL)
   openssl rand -hex 32

   # PowerShell (Windows)
   -join ((1..32) | ForEach-Object { '{0:X2}' -f (Get-Random -Max 256) })
   ```
2. Set the secret in Supabase Secrets (do NOT put this in any `.env` file):
   ```bash
   supabase secrets set PHI_ENCRYPTION_KEY="<generated-64-char-hex-key>"
   ```
3. If rotating an existing key with encrypted data in Postgres:
   - Run a migration script that reads with `OLD_KEY` and re-encrypts with `NEW_KEY`.
   - Never overwrite `PHI_ENCRYPTION_KEY` in production without migrating existing encrypted records.

### 2.3 External Integrations (Optional Services)
| Service | Setting Name | Rotation Procedure |
| :--- | :--- | :--- |
| **Resend (Email)** | `RESEND_API_KEY` | Supabase Dashboard > Secrets > Set `RESEND_API_KEY` |
| **Twilio (SMS)** | `TWILIO_AUTH_TOKEN` | Twilio Console > API Keys > Create New API Key & Revoke Old |
| **OpenAI / LLM** | `OPENAI_API_KEY` | OpenAI Platform > API Keys > Revoke old key |
| **Anthropic** | `ANTHROPIC_API_KEY` | Anthropic Console > API Keys > Rotate Key |

---

## 3. Local Development vs. Production Configurations

### Local Development (`.env.local`)
Create `.env.local` (which is gitignored):
```bash
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-publishable-key"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_E2E_MOCK_AUTH="false"
VITE_CLINICAL_SERVICE_URL="http://localhost:8000/api/clinical"
VITE_API_KEY=""
```

### Production Deployment (Vercel / Cloudflare / Netlify)
In your production hosting environment, configure environment variables:
- `VITE_SUPABASE_URL`: `https://<prod-project-id>.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY`: `<anon-public-key>`
- `VITE_E2E_MOCK_AUTH`: `"false"`

**NEVER set `SUPABASE_SERVICE_ROLE_KEY` in client frontend hosting environments.**

---

## 4. Post-Rotation Verification Checklist

- [ ] Run `npm run build` to verify that client bundle builds without secret leakage.
- [ ] Run `npm run test:unit` to verify that mocked auth tests pass.
- [ ] Verify that unauthorized requests to edge functions return HTTP 401/403.
- [ ] Verify that pharmacy interaction check fails closed if edge function or database is unreachable.
- [ ] Confirm `.env` file contains no private keys before committing git changes.
