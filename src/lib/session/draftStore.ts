/**
 * In-memory draft store for unsaved form input.
 *
 * Drafts live in module memory only, never in localStorage or sessionStorage. The
 * logout purge clears browser storage, so a stored draft would be lost on sign-out.
 * Drafts are scoped by user id, so a draft is never shown to a different account on a
 * shared workstation. A full page reload clears them, by design: clinical drafts must
 * not outlive the browser session.
 */
const drafts = new Map<string, unknown>();

function draftKey(scope: string, formKey: string): string {
  return `${scope}::${formKey}`;
}

export function saveDraft(scope: string, formKey: string, value: unknown): void {
  drafts.set(draftKey(scope, formKey), value);
}

export function readDraft<T>(scope: string, formKey: string): T | undefined {
  return drafts.get(draftKey(scope, formKey)) as T | undefined;
}

export function discardDraft(scope: string, formKey: string): void {
  drafts.delete(draftKey(scope, formKey));
}

/** Test helper and for explicit clean-up. */
export function clearAllDrafts(): void {
  drafts.clear();
}
