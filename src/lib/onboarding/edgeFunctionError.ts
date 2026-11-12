/**
 * Turns an error from `supabase.functions.invoke` into the message the server
 * returned.
 *
 * supabase-js reports every non-2xx response as a generic
 * "Edge Function returned a non-2xx status code" and keeps the HTTP response on
 * `error.context`. The onboarding functions return a human-readable
 * `{ error: "..." }` body (for example a 409 "This account already belongs to a
 * hospital..."), so read that body and show it instead of the generic text.
 */
export async function getEdgeFunctionErrorMessage(
  error: unknown,
  fallback: string
): Promise<string> {
  const context = (error as { context?: unknown } | null | undefined)?.context;

  if (context && typeof (context as Response).json === 'function') {
    try {
      const body = (await (context as Response).json()) as { error?: unknown } | null;
      if (body && typeof body.error === 'string' && body.error.trim() !== '') {
        return body.error;
      }
    } catch {
      // Body was empty or not JSON; fall through to the error's own message.
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
