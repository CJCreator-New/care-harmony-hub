/**
 * Tracks whether a hospital sign-up submit is running (FUNC-03).
 *
 * Signing up signs the new account in, which makes `PublicRoute` redirect
 * `/hospital/signup` to the dashboard before the hospital has been created. While
 * a submit is in flight, `PublicRoute` must leave the page alone.
 */
let hospitalSignupInFlight = false;

export function setHospitalSignupInFlight(inFlight: boolean): void {
  hospitalSignupInFlight = inFlight;
}

export function isHospitalSignupInFlight(): boolean {
  return hospitalSignupInFlight;
}
