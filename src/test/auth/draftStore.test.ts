import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveDraft, readDraft, discardDraft, clearAllDrafts } from '@/lib/session/draftStore';

describe('draftStore', () => {
  beforeEach(() => {
    clearAllDrafts();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps drafts in memory, scoped by user and form', () => {
    saveDraft('user-a', 'consultation:1', 'Chest pain since Monday');
    expect(readDraft<string>('user-a', 'consultation:1')).toBe('Chest pain since Monday');

    // A different account on the same browser never sees another user's draft.
    expect(readDraft<string>('user-b', 'consultation:1')).toBeUndefined();
    expect(readDraft<string>('user-a', 'consultation:2')).toBeUndefined();
  });

  it('discards a draft once it has been saved', () => {
    saveDraft('user-a', 'form', 'text');
    discardDraft('user-a', 'form');
    expect(readDraft('user-a', 'form')).toBeUndefined();
  });

  it('never writes drafts to localStorage or sessionStorage', () => {
    const localSet = vi.spyOn(Storage.prototype, 'setItem');
    saveDraft('user-a', 'form', 'clinical text');
    expect(localSet).not.toHaveBeenCalled();
  });
});
