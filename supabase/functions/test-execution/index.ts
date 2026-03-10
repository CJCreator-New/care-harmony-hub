import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from "../_shared/cors.ts"
import { authorize } from "../_shared/authorize.ts"
import { withRateLimit } from "../_shared/rateLimit.ts"

interface TestExecutionResponse {
  id: string
  status: 'Passed' | 'Failed'
  duration: number
  logs: string
  error?: string
  timestamp: string
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Only admin/super_admin may trigger test execution
  const authErr = await authorize(req, ['admin', 'super_admin'])
  if (authErr) return authErr

  // Remote arbitrary-script execution is disabled — callers should use the
  // project's CI pipeline instead. Return a 501 so clients can detect this.
  return new Response(
    JSON.stringify({ error: 'Remote script execution is not supported. Use the CI pipeline to run tests.' }),
    { status: 501, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

serve((req) => withRateLimit(req, handler))