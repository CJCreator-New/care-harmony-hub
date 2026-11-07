import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  describeAuthError,
  isNetworkAuthError,
  NETWORK_AUTH_MESSAGE,
  SERVER_AUTH_MESSAGE,
} from '@/lib/auth/authErrors';

const RAW_CODE_PATTERN = /invalid_credentials|over_request_rate_limit|email_not_confirmed|NetworkError|Failed to fetch|AuthApiError|_[a-z]+_[a-z]+/;

function authError(code: string, message = 'raw text', status = 400) {
  return Object.assign(new Error(message), { name: 'AuthApiError', code, status });
}

describe('describeAuthError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps invalid credentials to a plain sentence on login', () => {
    const text = describeAuthError(authError('invalid_credentials', 'Invalid login credentials'), 'login');
    expect(text).toBe('The email or password is not right. Check both and try again.');
  });

  it('maps an unconfirmed email on login', () => {
    expect(describeAuthError(authError('email_not_confirmed'), 'login')).toMatch(/Confirm your email/);
  });

  it('maps rate limiting to a wait message', () => {
    expect(describeAuthError(authError('over_request_rate_limit', 'x', 429), 'login')).toMatch(
      /Too many attempts/,
    );
  });

  it('maps duplicate accounts on sign-up', () => {
    expect(describeAuthError(authError('user_already_exists'), 'signup')).toMatch(/already exists/);
  });

  it('recognises the message text when no code is present', () => {
    const error = new Error('Invalid login credentials');
    expect(describeAuthError(error, 'login')).toBe(
      'The email or password is not right. Check both and try again.',
    );
  });

  it('keeps the app-written password rule text, which already says what to fix', () => {
    const error = new Error('Password does not meet requirements: at least 8 characters');
    expect(describeAuthError(error, 'signup')).toBe(
      'Password does not meet requirements: at least 8 characters',
    );
  });

  it('shows the network message for a failed fetch, never the raw browser text', () => {
    const error = new TypeError('Failed to fetch');
    expect(describeAuthError(error, 'login')).toBe(NETWORK_AUTH_MESSAGE);
    expect(describeAuthError(new Error('NetworkError: Failed to fetch'), 'password-reset')).toBe(
      NETWORK_AUTH_MESSAGE,
    );
  });

  it('shows the network message when the browser reports it is offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    expect(describeAuthError(new Error('something odd'), 'login')).toBe(NETWORK_AUTH_MESSAGE);
  });

  it('shows a server message for 5xx responses', () => {
    expect(describeAuthError(authError('unexpected_failure', 'boom', 503), 'signup')).toBe(
      SERVER_AUTH_MESSAGE,
    );
  });

  it('falls back to a flow-specific sentence for unknown errors', () => {
    expect(describeAuthError(authError('something_new', 'internal detail'), 'login')).toBe(
      'We could not sign you in. Try again.',
    );
    expect(describeAuthError(authError('something_new'), 'signup')).toBe(
      'We could not create your account. Try again.',
    );
    expect(describeAuthError(undefined, 'password-reset')).toBe('We could not send the reset link. Try again.');
  });

  it('never returns raw codes, stack text or technical messages', () => {
    const inputs: unknown[] = [
      authError('invalid_credentials', 'Invalid login credentials'),
      authError('over_email_send_rate_limit'),
      authError('weird_code_x_y', 'TypeError: cannot read properties of undefined'),
      new Error('NetworkError: Failed to fetch'),
      { message: 'Mock auth: wrong password.' },
    ];
    for (const input of inputs) {
      for (const flow of ['login', 'signup', 'password-reset'] as const) {
        const text = describeAuthError(input, flow);
        expect(text).not.toMatch(RAW_CODE_PATTERN);
        expect(text).not.toMatch(/TypeError|cannot read/);
        expect(text.endsWith('.')).toBe(true);
      }
    }
  });
});

describe('isNetworkAuthError', () => {
  it('detects fetch failures and ignores auth responses', () => {
    expect(isNetworkAuthError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkAuthError(authError('invalid_credentials'))).toBe(false);
  });
});
