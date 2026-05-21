// Helper to verify hospital scope between a resolved hospital id and JWT claim
export function verifyHospitalScope(resolvedHospitalId: string | null | undefined, jwtHospitalId: string | null | undefined) {
  if (!resolvedHospitalId) {
    const err: any = new Error('Unable to resolve hospital scope')
    err.status = 400
    throw err
  }
  if (!jwtHospitalId) {
    const err: any = new Error('Missing hospital_id in JWT')
    err.status = 403
    throw err
  }
  if (resolvedHospitalId !== jwtHospitalId) {
    const err: any = new Error('Hospital scope mismatch')
    err.status = 403
    throw err
  }
  return true
}

// Placeholder resolve function - edge functions should implement real resolver.
export async function resolveHospitalIdFromReq(_req: any): Promise<string | null> {
  // In production, call existing resolveHospitalId logic (e.g., from JWT, headers,
  // or DB lookup). This is a small stub for unit testing and local usage.
  return null
}
