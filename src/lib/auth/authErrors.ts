/**
 * Maps Supabase Auth errors, network failures and HTTP statuses to plain
 * sentences for the login, sign-up and password-reset screens.
 *
 * Raw error codes and messages (for example "Invalid login credentials" or
 * "NetworkError: Failed to fetch") are never returned to the UI. Callers that
 * need the technical detail should log it themselves, sanitised.
 */

export type AuthFlow = 'login' | 'signup' | 'password-reset';

const CODE_MESSAGES: Record<string, string> = {
  invalid_credentials: 'The email or password is not right. Check both and try again.',
  email_not_confirmed: 'Confirm your email address first. Check your inbox for the confirmation link.',
  user_banned: 'This account is suspended. Contact your hospital administrator.',
  user_not_found: 'We could not find an account for that email address.',
  email_address_invalid: 'Enter a valid email address.',
  email_address_not_authorized: 'This email address is not allowed to use this system.',
  email_exists: 'An account with this email already exists. Try signing in instead.',
  user_already_exists: 'An account with this email already exists. Try signing in instead.',
  weak_password: 'That password is too weak. Use at least 8 characters that are hard to guess.',
  same_password: 'Choose a password you have not used before.',
  signup_disabled: 'New sign-ups are turned off. Ask your hospital administrator for an invitation.',
  session_expired: 'Your session has ended. Sign in again to continue.',
  session_not_found: 'Your session has ended. Sign in again to continue.',
  refresh_token_not_found: 'Your session has ended. Sign in again to continue.',
  refresh_token_already_used: 'Your session has ended. Sign in again to continue.',
  over_request_rate_limit: 'Too many attempts. Wait a few minutes and try again.',
  over_email_send_rate_limit: 'We have sent several emails recently. Wait a few minutes and try again.',
  over_sms_send_rate_limit: 'We have sent several codes recently. Wait a few minutes and try again.',
  captcha_failed: 'The security check did not pass. Try again.',
  otp_expired: 'That code has expired. Request a new one.',
  mfa_verification_failed: 'That verification code is not right. Try again.',
  mfa_challenge_expired: 'That verification step has expired. Start again.',
  reauthentication_needed: 'For your security, confirm your password again to continue.',
};

const FLOW_FALLBACKS: Record<AuthFlow, string> = {
  login: 'We could not sign you in. Try again.',
  signup: 'We could not create your account. Try again.',
  'password-reset': 'We could not send the reset link. Try again.',
};

export const NETWORK_AUTH_MESSAGE =
  "We can't reach the server. Check your internet connection and try again.";

export const SERVER_AUTH_MESSAGE =
  'The server had a problem. Wait a moment and try again.';

interface ErrorLike {
  code?: unknown;
  status?: unknown;
  message?: unknown;
  name?: unknown;
}

const NETWORK_MESSAGE_PATTERN = /failed to fetch|networkerror|network request failed|load failed|network error/i;

function asErrorLike(error: unknown): ErrorLike | null {
  if (typeof error === 'object' && error !== null) return error as ErrorLike;
  if (typeof error === 'string') return { message: error };
  return null;
}

/** True when the request never reached the server (offline, DNS, CORS, dropped connection). */
export function isNetworkAuthError(error: unknown): boolean {
  const info = asErrorLike(error);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (!info) return false;
  const message = typeof info.message === 'string' ? info.message : '';
  return NETWORK_MESSAGE_PATTERN.test(message);
}

/** Map an error from Supabase Auth (or the network) to one plain sentence for the given flow. */
export function describeAuthError(error: unknown, flow: AuthFlow): string {
  const info = asErrorLike(error);
  if (!info) return FLOW_FALLBACKS[flow];

  // App-written password rule text is already plain English and tells the user what to fix.
  const rawMessage = typeof info.message === 'string' ? info.message : '';
  if (rawMessage.startsWith('Password does not meet requirements')) return rawMessage;

  const code = typeof info.code === 'string' ? info.code : undefined;
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  // Older Supabase responses sometimes carry only the message text.
  const message = typeof info.message === 'string' ? info.message : '';
  if (/invalid login credentials/i.test(message)) return CODE_MESSAGES.invalid_credentials;
  if (/email not confirmed/i.test(message)) return CODE_MESSAGES.email_not_confirmed;
  if (/already (been )?registered|already exists/i.test(message)) return CODE_MESSAGES.user_already_exists;

  if (isNetworkAuthError(error)) return NETWORK_AUTH_MESSAGE;

  const status = typeof info.status === 'number' ? info.status : undefined;
  if (status === 429) return CODE_MESSAGES.over_request_rate_limit;
  if (status !== undefined && status >= 500) return SERVER_AUTH_MESSAGE;

  return FLOW_FALLBACKS[flow];
}
