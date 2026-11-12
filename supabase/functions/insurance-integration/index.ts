// insurance-integration (S2-07 / EDGE-10)
//
// No clearinghouse or payer adapter exists in this repository. The previous version
// returned hard-coded eligibility, claim-status and payment results (every patient
// eligible, 80% approved, a fixed NPI) and persisted them as if a payer had answered.
// Those paths are removed. Every action returns 501 and writes nothing until a real
// adapter is added (270/271 eligibility, 837/835 claims) behind explicit configuration.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withRateLimit } from "../_shared/rateLimit.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getAuthorizedActor } from "../_shared/authorize.ts";

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { actor, response: authError } = await getAuthorizedActor(req, ["admin", "receptionist"]);
  if (authError || !actor) return authError!;

  return new Response(
    JSON.stringify({
      error: "Insurance integration is not available",
      code: "insurance_provider_not_configured",
    }),
    { status: 501, headers: { "Content-Type": "application/json", ...corsHeaders } },
  );
};

serve((req) => withRateLimit(req, handler));
