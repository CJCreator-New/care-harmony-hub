# Secret rotation, git history purge and test-account removal (S0-11)

| | |
|---|---|
| Roadmap task | S0-11 (P0), in [IMPLEMENTATION_ROADMAP.md](../repository-audit/IMPLEMENTATION_ROADMAP.md) |
| Issues | SECF-20, SECF-19, OPS-16, SECF-21, OPS-17, OPS-06 |
| Replaces | `.scratch/audit-remediation/issues/18-git-secrets-purge.md` (its `--path-glob '*.env*'` would also delete `.env.example` and `.env.test`) |
| Audience | Repository owner, Supabase project owner, whoever controls Lovable, hosting and provider accounts |
| Status | Repository changes are done (see section 9). Every step in sections 2 to 8 is an **operator action** that has not been performed yet. |

**Ground rules**

1. **Rotate before you purge.** Rewriting history does not un-leak anything. Every clone, fork, CI cache, Lovable copy and GitHub's own cached `refs/pull/*` views keep the old values. Treat every value listed here as compromised whether or not the purge succeeds.
2. **Never paste a secret value** into an issue, PR, commit, chat or this document. Refer to a value by its file and line, and record only its type and length.
3. **Work against production only in the steps that say so.** Steps that seed or test run against the new test project (section 5) or a local stack (`supabase start`).

---

## 1. Inventory (values redacted)

The inventory comes from `git log --all -p` across all 19 refs, plus `git grep` over the tree at `a1208ce`. Values were matched by shape and then compared by equality, without printing them. The clone used for this audit is **shallow**: its oldest visible commit is `df8831e`, dated 2026-04-01. Section 6.1 repeats the scan on a full mirror before the purge.

Legend for the "Where" column:

- **Tree**: present in the working tree at `a1208ce` and removed by the S0-11 repository commits.
- **History**: present only in earlier commits.

| # | Credential (type) | Location(s) | Where | Notes |
|---|---|---|---|---|
| C1 | Supabase anon key, legacy JWT, `role=anon`, `ref` = production project (208 chars) | `.env` (`VITE_SUPABASE_PUBLISHABLE_KEY`) | History: added by `df8831e`/`ff2ea46`, deleted by `791c933` | Public by design and shipped in every bundle. It belongs to production, so rotating it is still required by SECF-20. No `service_role` JWT was found anywhere in visible history (the `.env` `SUPABASE_SERVICE_ROLE_KEY=` line was empty). |
| C2 | Supabase project URL and ref | `.env`, `supabase/config.toml:1`, `deploy.bat`, `scripts/inspect-database-rls.sql:459`, `tests/security/authentication.test.ts:91` | Tree + history | An identifier, not a secret. It stays: the guards in section 9 use it to block production targets. |
| C3 | **Former client-side PHI encryption key** `VITE_ENCRYPTION_KEY` (39 chars) | `.env`; `docs/AUDIT_TRACKER.md` (`5a2dc50`); `docs/QUICK_START_15_MIN.md` (`df8831e`) | History only | **Highest impact.** Any PHI encrypted with it is decryptable by anyone with repo access. See section 4.2. |
| C4 | Generic frontend API key `VITE_API_KEY` (33 chars) | `.env`; `docs/QUICK_START_15_MIN.md`. The **same value** is the Kong `caresync-frontend` consumer key (C6), `REACT_APP_API_KEY` in `docker-compose.dev.yml:40`, `scripts/init-kong.sh` (echoed) and `docs/COMPREHENSIVE_AUDIT_REPORT.md:505` | History; tree (kong/dev compose/init script/doc) | One value reused in five places. |
| C5 | Kong database password `KONG_PG_PASSWORD` (25 chars) | `.env.kong`; `docker-compose.yml:19,49,73` (also used as the `kong-database` `POSTGRES_PASSWORD`) | History; tree (compose) | |
| C6 | Kong key-auth consumer keys ×3 (`caresync-frontend` 33, `caresync-mobile` 31, `caresync-admin` 30 chars) | `kong.yml:159-165`; all three echoed by `scripts/init-kong.sh:51-53` | Tree + history | `docker-compose.prod.yml` mounted this file into the production Kong. |
| C7 | Loggly customer token (13 chars) | `kong.yml:306` | Tree + history | |
| C8 | Stale Kong API key used by the test scripts (28 chars, not one of C6) | `scripts/test-rate-limiting.sh:7`, `.ps1:5`; `scripts/test-response-caching.sh:7`, `.ps1:5` | Tree + history | Rotate if it was ever provisioned in a gateway. |
| C9 | Clinical-service `JWT_SECRET` (31) and `ENCRYPTION_KEY` (32) | `docker-compose.yml:95-96` | Tree + history | |
| C10 | Main Postgres password (29) | `docker-compose.yml:113` and inline in `DATABASE_URL` at `:92` | Tree + history | |
| C11 | Grafana admin password (a well-known default) | `docker-compose.yml:212` | Tree + history | |
| C12 | Kong Admin GUI session secret (28) | `docker-compose.dev.yml:12` | Tree + history | |
| C13 | Patient-service DB password (16), `JWT_SECRET` (46), `ENCRYPTION_KEY` (54) | `services/patient-service/docker-compose.yml:14,17,18,36`; DB password also in `services/patient-service/.env.example:10` | Tree + history | |
| C14 | Appointment-service DB password (20) | `services/appointment-service/docker-compose.yml:40` | Tree + history | |
| C15 | **Shared E2E password** (12 chars) for 7 accounts: `admin@`, `doctor@`, `nurse@`, `reception@`, `pharmacy@`, `lab@`, `patient@testgeneral.com` | `.env.test:7-29`; `scripts/create-test-users.js:52-112` (also printed to stdout); `scripts/seed-e2e-data.mjs:18` (fallback for `test-*@caresync.local` users); `src/pages/hospital/LoginPage.tsx:312,329`; 26 files under `tests/e2e/`; `tests/test/e2e-fixtures.ts`; `tests/performance/auth-flow.k6.js` (history only); `.scratch/e2e-testing/issues/01-…md:36` | Tree + history | **P1 (SECF-21).** Includes an **admin** account. See section 3. |
| C16 | Fixed test UUIDs with an `admin` role grant | `supabase/migrations/20260204000011_misc.sql:~7005-7145` (from legacy `20260125000000_create_test_users.sql`) | Tree | Not a secret, but it creates the "Test General Hospital" tenant, its profiles and `user_roles` (`…440003` = admin) **in whatever project the migrations are applied to**. Combined with C15 this gives a known-password admin. |
| C17 | Provider keys (OpenAI, Anthropic, Twilio auth token, Lovable API key) as `VITE_*` | `.github/workflows/ci-pipeline.yml:203-211` | Tree + history | **Canary strings only** (`AUDITCANARY_*`). They prove nothing leaks into `dist/`. **No real provider key was found in the repo or its visible history.** These keys may still be set in deployed build environments (S0-09). See section 4.4. |
| C18 | Local/CI defaults (`postgres`/`test` passwords for disposable containers, `postgresql://user:password@…` doc placeholders, `your_secure_…` placeholders in `.env.prod.example`) | various | Tree | Not credentials. They are allowlisted in `.gitleaks.toml`. |

**Counts.** There are 17 distinct secret values, not counting the Grafana default. The current tree held 15 of them (C4 to C15) until the S0-11 commits removed them. Two exist only in history: the C1 anon JWT and the C3 PHI key. By type, they are:

- Supabase key: 1
- PHI/field encryption keys: 3
- JWT signing secrets: 2
- Gateway or API keys: 4
- Log-shipping token: 1
- Database passwords: 4
- Session secret: 1
- Shared user password: 1 (7 accounts)

The provider API keys from S0-09 were not found.

---

## 2. Order of operations (priority)

| Step | Priority | Action | Section |
|---|---|---|---|
| 1 | P0, now | Remove the shared test accounts and the test tenant from **production**, then audit their activity | 3 |
| 2 | P0 | Decide whether C3 (old PHI key) ever encrypted production data. Rotate `PHI_ENCRYPTION_KEY` and re-encrypt. | 4.2 |
| 3 | P0 | Rotate Supabase API keys (C1). Rotate the provider keys of any `VITE_*` secret that was ever set in a deployed build (S0-09). | 4.1, 4.4 |
| 4 | P1 | Rotate the Kong, Loggly and microservice credentials (C4 to C14) wherever that stack ran | 4.3 |
| 5 | P1 | Create the separate test/staging Supabase project and move every seed and test run there | 5 |
| 6 | P1 | Enable GitHub secret scanning and push protection. Make `Secret Scan` a required check. | 7 |
| 7 | P1 | Purge history with `git filter-repo` in a coordinated freeze: all clones, Lovable, branch protection | 6 |
| 8 | — | Verify and write the rotation record | 8 |

Steps 1 to 4 do not depend on the purge, so do them first. Step 7 must come after step 6, so that push protection blocks any re-push of the old values from a stale clone.

---

## 3. Remove shared test accounts from production (SECF-21, OPS-17)

Use the **production** project, Supabase dashboard → SQL editor, with a role that can read `auth`. All statements are read-only until 3.3.

### 3.1 Find them

```sql
-- Shared accounts (C15), seed-script accounts and the fixed migration UUIDs (C16)
select id, email, created_at, last_sign_in_at, banned_until
from auth.users
where email ilike '%@testgeneral.com'
   or email ilike 'test-%@caresync.local'
   or id::text like '550e8400-e29b-41d4-a716-4466554400%'
order by created_at;

-- Tenant and role grants created by the squashed migration (C16)
select id, name from public.hospitals
where id = '550e8400-e29b-41d4-a716-446655440001' or name = 'Test General Hospital';

select ur.user_id, ur.role
from public.user_roles ur
where ur.user_id::text like '550e8400-e29b-41d4-a716-4466554400%'
   or ur.user_id in (select id from auth.users where email ilike '%@testgeneral.com');

-- Anything real attached to the test tenant? (Review before deleting.)
select 'patients' t, count(*) from public.patients where hospital_id = '550e8400-e29b-41d4-a716-446655440001'
union all select 'profiles', count(*) from public.profiles where hospital_id = '550e8400-e29b-41d4-a716-446655440001';
```

### 3.2 Audit what they did

Any of these accounts that ever signed in could have been used by anyone who read the repo.

- Check `last_sign_in_at`. Then check the auth logs (Dashboard → Logs → Auth) for sign-ins by these user IDs, especially from IPs that are not your CI or your developers.
- Check `public.activity_logs` / `audit_logs` for these `user_id`s, and any rows they wrote outside the test hospital, which would be a cross-tenant indicator, see SECF-09 and SECF-10.
- If you see unexplained access, open an incident. The roadmap treats S0 as incident response when real PHI is present.

### 3.3 Disable, then delete

1. **Ban first.** Dashboard → Authentication → Users → *Ban user*, or the Admin API `updateUserById(id, { ban_duration: '876000h' })`. Banning stops new sessions immediately.
2. Remove the role grants (`delete from public.user_roles where user_id in (…)`) and the test tenant's profiles.
3. Delete the auth users (Dashboard → *Delete user*). `profiles` and the other `ON DELETE CASCADE` children go with them.
4. Delete the `Test General Hospital` row only after 3.1 shows that no real patients are attached to it.
5. Re-run 3.1. All queries must return 0 rows. This is the acceptance criterion: "Production has 0 `@testgeneral.com` users".

### 3.4 Stop it happening again

- The repository now refuses production targets: see section 9.
- **Follow-up, outside this change:** remove the test-tenant seed (C16) from the production migration chain as part of the S0-01 baseline. Move it to `supabase/seed.sql`, which runs only on `supabase db reset` against local or test projects.

---

## 4. Rotate credentials

Record each rotation in the table in section 8: credential, date, operator, where updated, and how the old value was verified dead. **Never record the value.**

### 4.1 Supabase API keys (C1; also any service-role key ever shared)

Prefer moving to Supabase's new API keys (`sb_publishable_…` / `sb_secret_…`) over rotating the legacy JWT secret. Rotating the legacy JWT secret invalidates the anon key, the service-role key **and every user session** at once.

1. Dashboard → Project Settings → API Keys: create a **publishable** key and a **secret** key.
2. Update the consumers:
   - **Lovable / hosting build env:** `VITE_SUPABASE_PUBLISHABLE_KEY` = the new publishable key. Rebuild and redeploy.
   - **Edge functions:** Supabase injects the `SUPABASE_*` keys automatically. Confirm that no function reads a manually set copy (`supabase secrets list`). Replace any such copy with the new secret key.
   - **GitHub:** update the repository and environment secrets that hold Supabase keys.
3. When traffic shows no legacy key use (API logs), **disable the legacy anon and service_role keys** in Project Settings → API Keys → Legacy.
4. If you must stay on legacy keys, rotate the JWT secret instead (Project Settings → JWT Keys) in a maintenance window. All users will have to sign in again.
5. Verify: a request with the old anon JWT returns **401** (issue 18 AC-3). Use the old key only from a secure operator shell, never from CI logs.

### 4.2 PHI encryption key (C3), with a re-encryption plan

Background: before `supabase/functions/phi-crypto` existed, the client encrypted PHI with `VITE_ENCRYPTION_KEY` (removed from `src/` in `6bdb50c`). The edge function now derives an AES-256-GCM key from the server-only secret `PHI_ENCRYPTION_KEY` (PBKDF2, `KEY_VERSION = "v1"`). Encrypted rows carry `encryption_metadata`, for example on `consultations` and `patients`, and in telehealth messages and prescriptions.

1. **Is the server key the old key?** In an operator shell, compare digests rather than values. Compute `sha256` of the historical value with `git show 791c933^:.env`, piped through `sed` into `sha256sum`, without echoing it. Compare it with `sha256` of the current `PHI_ENCRYPTION_KEY`, read from the place where you stored it when you set it. Secrets cannot be read back from Supabase, so if you do not have the value, assume it is the same and rotate.
2. **Find the ciphertext.**
   ```sql
   select 'consultations' t, count(*) from public.consultations where encryption_metadata is not null and encryption_metadata <> '{}'::jsonb
   union all select 'patients', count(*) from public.patients where encryption_metadata is not null and encryption_metadata <> '{}'::jsonb;
   -- repeat for every table with an encryption_metadata column:
   select table_name from information_schema.columns where column_name = 'encryption_metadata' and table_schema = 'public';
   ```
   Then group by the stored key version (`keyVersion` / `metadata->>'keyVersion'`). Rows written before `phi-crypto` used the client scheme.
3. **Add dual-key support (code change, separate ticket).** This needs a code change in the `phi-crypto` edge function, owned by S0-09/S1-09:
   - Accept `PHI_ENCRYPTION_KEY_PREVIOUS` for decrypt only, keyed by version.
   - Encrypt only with the new key under `KEY_VERSION = "v2"`.
   - Add a decrypt path for the legacy client scheme if step 2 found such rows.
4. **Rotate.** Generate a new key (`openssl rand -base64 48`). Run `supabase secrets set PHI_ENCRYPTION_KEY=<new> PHI_ENCRYPTION_KEY_PREVIOUS=<old>` from an operator shell. Deploy the function.
5. **Re-encrypt** with a one-off, service-side batch job that runs inside Supabase (an edge function or SQL plus the function). It must never pull plaintext PHI to a laptop. For each row with version < v2: decrypt with the previous key, encrypt with v2, update the row and its metadata in one transaction, in batches of about 500, with an audit-log entry per batch.
6. **Verify:** the counts by version show 0 rows below v2, and reads in the app decrypt correctly.
7. **Retire:** `supabase secrets unset PHI_ENCRYPTION_KEY_PREVIOUS`, and remove the legacy decrypt path.
8. If step 2 shows that PHI was encrypted with C3 **and** the repo was readable by anyone outside the covered workforce, take this to your privacy officer as a potential breach. HIPAA §164.402 risk assessment applies.

### 4.3 Kong, Loggly and the microservice stack (C4 to C14)

These belong to the archived Kong/microservice stack (`archive/docker-compose*.yml`, `archive/kong.yml`, `archive/services/*`). The audit recommends deleting that stack (OPS-05).

1. Find out where it ever ran: any host that used `archive/docker-compose.prod.yml` or `archive/.deployment/kubernetes`. **If it never ran anywhere reachable, deleting the stack is enough.** The values only need purging (section 6).
2. If it did run:
   - **Loggly (C7):** Loggly → Source Setup → Customer Tokens: create a new token and **delete the old one**.
   - **Kong consumer keys (C4, C6, C8):** generate new keys with `openssl rand -base64 32 | tr -d '/+=' | cut -c1-40`. Set `KONG_FRONTEND_API_KEY`, `KONG_MOBILE_API_KEY`, `KONG_ADMIN_API_KEY` and `LOGGLY_TOKEN` in the deploy environment. Run `archive/scripts/render-kong-config.sh` to produce the untracked `kong.rendered.yml`, then reload Kong. The old keys disappear when the declarative config is replaced. Confirm with `curl -H "apikey: <old>" … → 401`.
   - **Databases (C5, C10, C13, C14):** `ALTER ROLE … PASSWORD …` on each database, then update `KONG_DB_PASSWORD`, `DB_PASSWORD`, `PATIENT_DB_PASSWORD` and `APPOINTMENT_DB_PASSWORD`.
   - **JWT and encryption secrets (C9, C13):** rotate `JWT_SECRET`, which invalidates the service's tokens. Treat `ENCRYPTION_KEY` like 4.2 if any service stored ciphertext.
   - **Grafana (C11) and the Kong GUI session secret (C12):** set new values through `GRAFANA_PASSWORD` and `KONG_ADMIN_GUI_SESSION_SECRET`.
3. The compose files now fail to start unless every one of these variables is set (`${VAR:?…}`). The admin ports are published on `127.0.0.1` only.

### 4.4 AI and Twilio provider keys (S0-09 overlap: OPS-16, SECF-03)

The repo has no real values (C17 are canaries). However, any `VITE_OPENAI_API_KEY`, `VITE_ANTHROPIC_API_KEY`, `VITE_TWILIO_AUTH_TOKEN`, `VITE_LOVABLE_API_KEY` or `VITE_API_KEY` that was **ever set in a deployed build environment**, such as Lovable or hosting env vars, was inlined into the public JS bundle.

1. Check the Lovable project env and each hosting env for those names, including old deployments.
2. For each one that was set:
   - **Revoke** it in the provider console: OpenAI → API keys, Anthropic Console → API keys, Twilio → Auth Tokens → *Request secondary token* → promote → delete the old one, Lovable → workspace API keys.
   - **Remove** the `VITE_*` variable.
   - **Set** the new value only as a Supabase edge-function secret (`supabase secrets set NAME=…`).
3. CI already blocks these names in client code (`npm run security:client-secrets`).

### 4.5 Shared test password (C15)

Deleting the accounts (section 3) neutralises it. If the same string was ever reused as a real password anywhere else, change it there. New test accounts get a per-run password (section 5).

---

## 5. Separate test/staging Supabase project (OPS-17)

1. Create a new Supabase project (for example `caresync-test`) in the same org. **Do not** reuse the production ref.
2. Apply the schema with `supabase db push --db-url <test-db-url>`, or the S0-01 replayable baseline once it exists.
3. GitHub → Settings → Environments → create a `test` (or `staging`) environment and set:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the test project.
   - `SUPABASE_SERVICE_ROLE_KEY`, the test project's key. This key must never be the production one.
   - `E2E_TEST_PASSWORD`, a random value of at least 20 characters. Regenerate it whenever someone leaves the team.
   - `PRODUCTION_SUPABASE_REFS`, the production ref (redundant with `supabase/config.toml`, but explicit in CI).
4. Create the test users **in the test project**:
   ```bash
   SUPABASE_URL=https://<test-ref>.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<test service key> \
   E2E_TEST_PASSWORD=<per-run value> \
   node scripts/create-test-users.js
   ```
   The script exits when the URL is the production ref. It also exits when the password is shorter than 12 characters or equals the mock-auth value. It never prints the password.
5. Point `playwright.e2e-full.config.ts` runs at the test project: its `.env` URL plus `E2E_TEST_PASSWORD`. `tests/e2e/global-setup-seed.ts` refuses production.
6. Update `.env.staging.example` once the project exists: remove "until a dedicated staging project is provisioned".
7. **Local development:** `supabase start` (URL `http://127.0.0.1:54321`), plus `.env.local`. Mock-auth Playwright runs need no Supabase at all.

---

## 6. Purge git history

Do this **after** sections 3, 4 and 7. Plan a freeze window of about one hour, during which nobody pushes.

### 6.1 Prepare and coordinate

1. **Announce the freeze.** List every clone: developer machines, CI runners with persistent workspaces, worktrees under `.claude/worktrees/*`, Lovable, and any deploy host that does `git pull`. Every one of them must be **deleted and re-cloned** afterwards. A stale clone that pushes re-introduces the history.
2. **Merge or close open PRs.** Rewritten history orphans their bases. List the PRs with `gh pr list --state open`.
3. **Lovable:**
   - Lovable syncs this repo from `main`. Pause editing in Lovable during the window.
   - After the force-push, check that Lovable's GitHub sync follows the rewritten `main`. If it reports divergence, disconnect and reconnect the GitHub integration on the rewritten repo. Do **not** let Lovable push its old copy back.
   - Ask Lovable support whether their project version history keeps old file contents, and whether those can be purged.
4. **Forks:** `gh api repos/CJCreator-New/care-harmony-hub/forks`. Ask each owner to delete the fork, or report it to GitHub.
5. **Branch protection:** Settings → Branches (or Rulesets) → temporarily allow force-pushes on `main` (and on other protected branches) **for the operator only**.

### 6.2 Rewrite (operator workstation, fresh mirror)

```bash
# Requires git-filter-repo >= 2.38 (pip install git-filter-repo)
git clone --mirror https://github.com/CJCreator-New/care-harmony-hub.git chh-purge.git
cd chh-purge.git

# 0. Full-history scan BEFORE the rewrite (this audit's clone was shallow).
#    Add any extra hit to the inventory and to replacements.txt.
gitleaks git . --config <path-to>/.gitleaks.toml --log-opts="--all" --redact --report-path ../before.json || true

# 1. Build the replacement list from the last commits that held each literal.
#    Values go only into a mode-600 file outside the repo, never to the terminal.
#    a1208ce = last commit before the S0-11 literal removal; 791c933^ = last with .env/.env.kong.
umask 077
{
  git show '791c933^:.env'      | sed -nE 's/^(VITE_ENCRYPTION_KEY|VITE_API_KEY|VITE_SUPABASE_PUBLISHABLE_KEY)="?([^"]+)"?\r?$/\2/p'
  git show '791c933^:.env.kong' | sed -nE 's/^KONG_PG_PASSWORD="?([^"]+)"?\r?$/\1/p'
  git show a1208ce:kong.yml     | sed -nE 's/^ +key: "?([^"$ ]+)"?$/\1/p'
  git show a1208ce:docker-compose.yml     | sed -nE 's/^ +- (KONG_PG_PASSWORD|POSTGRES_PASSWORD|JWT_SECRET|ENCRYPTION_KEY)=([^$].*)$/\2/p'
  git show a1208ce:docker-compose.dev.yml | sed -nE 's/^ +- (KONG_ADMIN_GUI_SESSION_CONF_SECRET|REACT_APP_API_KEY)=([^$].*)$/\2/p'
  git show a1208ce:scripts/test-rate-limiting.sh | sed -nE 's/^API_KEY="([^"]+)"$/\1/p'
  git show a1208ce:services/patient-service/docker-compose.yml     | sed -nE 's/^ +- (POSTGRES_PASSWORD|JWT_SECRET|ENCRYPTION_KEY)=([^$].*)$/\2/p'
  git show a1208ce:services/appointment-service/docker-compose.yml | sed -nE 's/^ +- POSTGRES_PASSWORD=([^$].*)$/\1/p'
  git show a1208ce:.env.test    | sed -nE 's/^E2E_ADMIN_PASSWORD=(.+)$/\1/p'
} | awk 'length($0) >= 10' | sort -u | sed 's/$/==>***REMOVED***/' > ../replacements.txt
wc -l ../replacements.txt     # expect 17 (count only; do not cat the file)

# 2. Drop the two env files from every commit (exact paths: keeps .env.example and .env.test),
#    and replace every remaining literal (docs, compose, kong.yml, scripts, tests) in all blobs.
git filter-repo --invert-paths --path .env --path .env.kong \
                --replace-text ../replacements.txt \
                --replace-message ../replacements.txt

# 3. Verify the rewrite before pushing
git log --all --oneline -- .env .env.kong            # must print nothing
while IFS= read -r line; do v="${line%%==>*}"; git grep -c -F -- "$v" $(git rev-list --all) >/dev/null 2>&1 && echo "STILL PRESENT (len ${#v})"; done < ../replacements.txt
gitleaks git . --config <path-to>/.gitleaks.toml --log-opts="--all" --redact   # must exit 0
```

`git filter-repo` removes the `origin` remote. Re-add it, then push everything:

```bash
git remote add origin https://github.com/CJCreator-New/care-harmony-hub.git
git push --force --mirror origin      # all branches and tags; refs/pull/* are read-only and are skipped
shred -u ../replacements.txt ../before.json 2>/dev/null || rm -P ../replacements.txt ../before.json
```

### 6.3 After the push

1. **GitHub cached data:** the old commits stay reachable through `refs/pull/*` and the commit SHAs until GitHub garbage-collects them. Open a GitHub Support request ("remove sensitive data / purge cached views"). Give the repo and the old SHAs (`df8831e`, `ff2ea46`, `791c933`, `5a2dc50` and all old branch tips). See GitHub Docs → *Removing sensitive data from a repository*.
2. **Re-enable branch protection** on `main`: no force-pushes, required checks (add `Secret Scan / gitleaks (new commits)`), required reviews.
3. Everyone **re-clones**. Delete old clones and worktrees. Never `git pull` into an old clone.
4. Check Lovable: it shows the rewritten `main` and builds green.
5. Run the `Secret Scan` workflow manually (Actions → Secret Scan → Run workflow). The full-scan job must pass.
6. Update `.scratch/audit-remediation/issues/18-git-secrets-purge.md` to `resolved`, and link the rotation record.

---

## 7. GitHub secret scanning and push protection

1. Settings → Code security (Advanced Security) → enable **Secret scanning** and **Push protection**. Public repos get both free. Private org repos need GitHub Secret Protection.
2. Enable **validity checks** (where offered) and **non-provider patterns**.
3. Optional custom patterns, matching `.gitleaks.toml`:
   - `sb_secret_[A-Za-z0-9_-]{20,}`
   - The service_role JWT pattern.
4. Triage existing alerts: Security → Secret scanning. Close each alert as *revoked* only after its section 4 rotation.
5. Make **`Secret Scan / gitleaks (new commits)`** a required status check on `main` (Settings → Branches / Rulesets).
6. Optional local hook: `gitleaks git --staged --config .gitleaks.toml --redact` in `.husky/pre-commit`, once gitleaks is part of the developer setup. This repo adds no npm dependency for it.

---

## 8. Verification and rotation record

Acceptance criteria (from S0-11, SECF-19/20/21, OPS-06/16/17):

- [ ] `git log --all -- .env .env.kong` is empty on the canonical remote.
- [ ] The `Secret Scan` full-scan job (tree and full history) passes.
- [ ] Old Supabase anon JWT, old Kong keys and the old Loggly token are rejected (401 or revoked).
- [ ] `PHI_ENCRYPTION_KEY` is rotated, 0 rows remain below the new key version, and the previous key is unset.
- [ ] Production has 0 `@testgeneral.com`, `test-*@caresync.local` and `550e8400-…` users, and no test tenant.
- [ ] Seed and test scripts abort on the production ref. Try it: `SUPABASE_URL=https://<prod-ref>.supabase.co node scripts/seed-e2e-data.mjs` must exit 1 with "REFUSING TO RUN".
- [ ] `grep -rE "PASSWORD=[^$]|SECRET=[^$]" archive/docker-compose*.yml` returns nothing, and no admin port is bound to 0.0.0.0.
- [ ] Push protection is on, and `Secret Scan` is a required check.

Rotation record. Keep it here or in your secrets manager. **No values.**

| Credential | Rotated on | By | Updated in | Old value verified dead (how) |
|---|---|---|---|---|
| C1 Supabase anon/legacy keys | | | | |
| C3 PHI encryption key | | | | |
| C4/C6/C8 Kong consumer keys | | | | |
| C7 Loggly token | | | | |
| C5/C10/C13/C14 DB passwords | | | | |
| C9/C13 JWT/encryption secrets | | | | |
| C11/C12 Grafana / Kong GUI session | | | | |
| C15 shared test accounts deleted | | | | |
| S0-09 provider keys (if ever set) | | | | |

---

## 9. What the repository change did (S0-11, repository part)

- **Current tree has no literal credentials.**
  - The compose files use `${VAR:?…}` and fail closed. Their admin, DB and Redis ports bind to `127.0.0.1`.
  - `archive/kong.yml` is a template rendered by `archive/scripts/render-kong-config.sh` or `archive/scripts/init-kong.sh`. Compose mounts the untracked `kong.rendered.yml`. The credentialed CORS lists have no `*.vercel.app` wildcard.
  - The test scripts read `KONG_API_KEY` and do not print it. Docs and `.env.example` files are redacted.
  - `.gitignore` ignores every `.env` / `.env.*` except `*.example` and `.env.test`.
- **No shared test password.**
  - `.env.test` holds only a self-describing mock-auth value. It is honoured only by DEV builds with `VITE_E2E_MOCK_AUTH=true`.
  - E2E specs get their password from `tests/e2e/support/test-credentials.ts`: `E2E_TEST_PASSWORD`, then the mock-auth value.
  - `create-test-users.js` and `seed-e2e-data.mjs` need a per-run password and never print it.
  - The login page hint has no literal.
- **Production guard** (`scripts/lib/supabase-target-guard.mjs`). It is used by `create-test-users.js`, `seed-e2e-data.mjs`, `seed-test-data.mjs` and `tests/e2e/global-setup-seed.ts`. They abort when the Supabase URL, DB URL or app URL is the production ref from `supabase/config.toml`, or a known production host. There is no override flag.
- **CI secret scanning:**
  - `.github/workflows/secret-scan.yml` runs gitleaks v8.21.2 in a pinned container with `--redact`. It scans new commits on PRs and pushes, and the tree plus full history weekly and on demand.
  - `.gitleaks.toml` uses the default rules plus rules for this repo, and a justified allowlist. The Supabase publishable key is deliberately not allowlisted: it is not committed.
  - The config was checked offline against the pre-S0-11 files: its rules flag all 21 literal sites. The gitleaks binary itself could not be run in the authoring environment, so treat the first CI run as the real validation.

**Known residuals (separate tickets):**

- C16: the test-tenant seed and its admin grant in `supabase/migrations/20260204000011_misc.sql` (S0-01).
- The `phi-crypto` dual-key and re-encryption code (4.2).
- `tests/security/authentication.test.ts` and `tests/api/*` call whatever project `.env` points to. In CI they hit `stub.supabase.co` (TEST-04). Locally they need the test project or `supabase start`.
- The vitest setup (`src/test/setup.ts`) has no production guard yet.
- `scripts/apply-rls-migration.mjs` and `scripts/validate-rls*.mjs` intentionally target a configured project with the service-role key. Run them against production only through the migration process.
- Image digest pinning and the deletion of the archived microservice stack (OPS-05, OPS-06).
