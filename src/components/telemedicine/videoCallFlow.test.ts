import { describe, it, expect } from 'vitest';
import {
  CALL_TRANSITIONS,
  CONSENT_TRANSITIONS,
  UPLOAD_TRANSITIONS,
  canMove,
  move,
  type CallPhase,
  type ConsentPhase,
  type UploadPhase,
} from './videoCallFlow';

describe('call connection phases', () => {
  it('connects, connects fully, and hangs up', () => {
    expect(move(CALL_TRANSITIONS, 'idle', 'connecting')).toBe('connecting');
    expect(move(CALL_TRANSITIONS, 'connecting', 'connected')).toBe('connected');
    expect(move(CALL_TRANSITIONS, 'connected', 'idle')).toBe('idle');
  });

  it('a failed or abandoned connect returns to idle', () => {
    expect(move(CALL_TRANSITIONS, 'connecting', 'idle')).toBe('idle');
  });

  it('cannot be connected and connecting at once', () => {
    expect(canMove(CALL_TRANSITIONS, 'connected', 'connecting')).toBe(false);
    expect(move(CALL_TRANSITIONS, 'connected', 'connecting')).toBe('connected');
  });

  it('cannot skip straight to connected', () => {
    expect(move(CALL_TRANSITIONS, 'idle', 'connected')).toBe('idle');
  });
});

describe('recording consent phases', () => {
  it('moves through saving to granted on a successful save', () => {
    expect(move(CONSENT_TRANSITIONS, 'not_granted', 'saving')).toBe('saving');
    expect(move(CONSENT_TRANSITIONS, 'saving', 'granted')).toBe('granted');
  });

  it('returns to not_granted when a save fails', () => {
    expect(move(CONSENT_TRANSITIONS, 'saving', 'not_granted')).toBe('not_granted');
  });

  it('can load an earlier grant directly, and reset it for another patient', () => {
    expect(move(CONSENT_TRANSITIONS, 'not_granted', 'granted')).toBe('granted');
    expect(move(CONSENT_TRANSITIONS, 'granted', 'not_granted')).toBe('not_granted');
  });

  it('cannot re-save over an existing grant', () => {
    expect(move(CONSENT_TRANSITIONS, 'granted', 'saving')).toBe('granted');
  });
});

describe('upload phases', () => {
  it('goes uploading -> success or error, and can upload again afterwards', () => {
    expect(move(UPLOAD_TRANSITIONS, 'idle', 'uploading')).toBe('uploading');
    expect(move(UPLOAD_TRANSITIONS, 'uploading', 'success')).toBe('success');
    expect(move(UPLOAD_TRANSITIONS, 'success', 'uploading')).toBe('uploading');
    expect(move(UPLOAD_TRANSITIONS, 'uploading', 'error')).toBe('error');
    expect(move(UPLOAD_TRANSITIONS, 'error', 'uploading')).toBe('uploading');
  });

  it('allows an overlapping upload while one is already running', () => {
    expect(move(UPLOAD_TRANSITIONS, 'uploading', 'uploading')).toBe('uploading');
  });

  it('cannot report success without an upload in progress', () => {
    expect(move(UPLOAD_TRANSITIONS, 'idle', 'success')).toBe('idle');
    expect(move(UPLOAD_TRANSITIONS, 'error', 'success')).toBe('error');
  });
});

describe('table integrity', () => {
  it('every target is a known phase in each table', () => {
    const callPhases: CallPhase[] = ['idle', 'connecting', 'connected'];
    const consentPhases: ConsentPhase[] = ['not_granted', 'saving', 'granted'];
    const uploadPhases: UploadPhase[] = ['idle', 'uploading', 'success', 'error'];

    for (const table of [CALL_TRANSITIONS, CONSENT_TRANSITIONS, UPLOAD_TRANSITIONS] as const) {
      const known = Object.keys(table);
      for (const targets of Object.values(table)) {
        for (const t of targets as string[]) {
          expect(known).toContain(t);
        }
      }
    }
    expect(Object.keys(CALL_TRANSITIONS).sort()).toEqual([...callPhases].sort());
    expect(Object.keys(CONSENT_TRANSITIONS).sort()).toEqual([...consentPhases].sort());
    expect(Object.keys(UPLOAD_TRANSITIONS).sort()).toEqual([...uploadPhases].sort());
  });
});
