// Rate Limiting Middleware for Supabase Edge Functions
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const store: Record<string, { count: number; resetTime: number }> = {};

const LIMITS: Record<string, RateLimitConfig> = {
  default: { windowMs: 60000, maxRequests: 60 },
  auth: { windowMs: 300000, maxRequests: 5 },
  ai: { windowMs: 60000, maxRequests: 10 },
};

export function rateLimit(id: string, config = LIMITS.default) {
  const now = Date.now();
  if (store[id]?.resetTime < now) delete store[id];
  if (!store[id]) store[id] = { count: 0, resetTime: now + config.windowMs };
  
  const current = store[id];
  if (current.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }
  
  current.count++;
  return { allowed: true, remaining: config.maxRequests - current.count, resetTime: current.resetTime };
}

export function getIdentifier(req: Request): string {
  const auth = req.headers.get('Authorization');
  if (auth) return `user:${auth.substring(0, 20)}`;
  return `ip:${req.headers.get('x-forwarded-for') || 'unknown'}`;
}

export async function withRateLimit(
  req: Request,
  handler: (req: Request) => Promise<Response>,
  config?: RateLimitConfig
): Promise<Response> {
  const result = rateLimit(getIdentifier(req), config);
  if (!result.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)) }
    });
  }
  const response = await handler(req);
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  return response;
}
