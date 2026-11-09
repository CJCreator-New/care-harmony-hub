/**
 * Telemedicine video call: explicit state machines.
 *
 * The modal previously tracked these lifecycles with paired booleans
 * (isConnecting / isConnected, hasTelemedicineConsent / isSavingConsent) and a
 * separate upload status. Impossible combinations could be written by any
 * handler. This module names each lifecycle and lists its legal moves, so the
 * component can reject an illegal move instead of silently entering it.
 *
 * Pure: no React, Supabase or WebRTC imports.
 */

// ── Call connection ────────────────────────────────────────────────────────

export type CallPhase = 'idle' | 'connecting' | 'connected';

export const CALL_TRANSITIONS: Readonly<Record<CallPhase, readonly CallPhase[]>> = {
  idle: ['connecting'],
  connecting: ['connected', 'idle'], // 'idle' = start failed or modal closed mid-connect
  connected: ['idle'], // hang up, remote hang-up, or modal closed
};

// ── Telemedicine recording consent ─────────────────────────────────────────

export type ConsentPhase = 'not_granted' | 'saving' | 'granted';

export const CONSENT_TRANSITIONS: Readonly<Record<ConsentPhase, readonly ConsentPhase[]>> = {
  not_granted: ['saving', 'granted'], // 'granted' when loaded from an earlier session
  saving: ['granted', 'not_granted'], // save failed
  granted: ['not_granted'], // reloaded for a patient without consent
};

// ── Recording upload (runs after a recording stops) ────────────────────────

export type UploadPhase = 'idle' | 'uploading' | 'success' | 'error';

/**
 * Uploads can overlap a new recording and each other, so upload is tracked
 * separately from whether a recording is currently running.
 */
export const UPLOAD_TRANSITIONS: Readonly<Record<UploadPhase, readonly UploadPhase[]>> = {
  idle: ['uploading'],
  uploading: ['success', 'error', 'uploading'], // 'uploading' again = a second upload started
  success: ['uploading'],
  error: ['uploading'],
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Same-state moves are always allowed, so repeated sets are harmless. */
export function canMove<T extends string>(
  table: Readonly<Record<T, readonly T[]>>,
  from: T,
  to: T
): boolean {
  return from === to || table[from].includes(to);
}

/** Returns `to` when the move is legal, otherwise keeps `from`. */
export function move<T extends string>(
  table: Readonly<Record<T, readonly T[]>>,
  from: T,
  to: T
): T {
  return canMove(table, from, to) ? to : from;
}
