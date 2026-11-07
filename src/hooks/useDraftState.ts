import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { discardDraft, readDraft, saveDraft } from '@/lib/session/draftStore';

/**
 * useState that keeps unsaved input in memory, so it survives an inactivity sign-out
 * and comes back when the same user reopens the form in this browser session.
 *
 * Call `discardDraft` after a successful save (returned as `clearDraft`).
 */
export function useDraftState<T>(formKey: string, initialValue: T) {
  const { user } = useAuth();
  const scope = user?.id ?? 'anonymous';
  const [value, setValue] = useState<T>(() => readDraft<T>(scope, formKey) ?? initialValue);

  useEffect(() => {
    if (Object.is(value, initialValue)) {
      discardDraft(scope, formKey);
    } else {
      saveDraft(scope, formKey, value);
    }
    // initialValue is a stable literal at every call site; only value and the key matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, formKey, value]);

  return {
    value,
    setValue,
    clearDraft: () => discardDraft(scope, formKey),
  } as const;
}
