/**
 * Single source of the password E2E specs type into the login form (S0-11, SECF-21).
 *
 * No credential literal lives in the specs. Resolution order:
 *   1. E2E_TEST_PASSWORD - the per-run password of the seeded accounts in the
 *      isolated test/staging Supabase project (CI secret or local shell env).
 *   2. VITE_E2E_MOCK_PASSWORD from the process env or from `.env.test` - the
 *      DEV-only mock-auth password. It unlocks nothing outside a DEV build with
 *      VITE_E2E_MOCK_AUTH=true and is not the password of any real account.
 *
 * Per-role overrides (E2E_<ROLE>_PASSWORD) are still honoured where specs read them.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readMockPasswordFromEnvTest(): string {
  try {
    const envTest = fileURLToPath(new URL('../../../.env.test', import.meta.url));
    if (!existsSync(envTest)) return '';
    const m = readFileSync(envTest, 'utf8').match(/^\s*VITE_E2E_MOCK_PASSWORD\s*=\s*["']?([^"'\r\n]*)["']?\s*$/m);
    return m ? m[1].trim() : '';
  } catch {
    return '';
  }
}

const fromEnv = (name: string): string => (process.env[name] || '').trim();

export const E2E_TEST_PASSWORD: string =
  fromEnv('E2E_TEST_PASSWORD') || fromEnv('VITE_E2E_MOCK_PASSWORD') || readMockPasswordFromEnvTest();

/** True when the password comes from the mock-auth value rather than a real test project. */
export const E2E_PASSWORD_IS_MOCK = !fromEnv('E2E_TEST_PASSWORD');
