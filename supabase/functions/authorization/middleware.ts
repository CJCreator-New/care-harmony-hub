import { verifyHospitalScope, resolveHospitalIdFromReq } from '../lib/scope'

// Adapted for Request -> Response edge function handlers
export function withHospitalScope(handler: (req: Request) => Promise<Response> | Response) {
  return async function wrapped(req: Request): Promise<Response> {
    // Extract hospital claim from JWT or headers. Adjust to your auth parsing.
    const jwtHospitalId = req.headers.get('x-hospital-id') || null
    const resolvedHospitalId = await resolveHospitalIdFromReq(req)
    try {
      verifyHospitalScope(resolvedHospitalId, jwtHospitalId)
    } catch (err: any) {
      // Log for audit
      console.error('hospital scope validation failed:', err.message)
      return new Response(JSON.stringify({ error: err.message }), { status: err.status || 403, headers: { 'Content-Type': 'application/json' } })
    }
    return handler(req)
  }
}
