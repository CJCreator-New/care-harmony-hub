# Performance Testing (k6)

This folder contains k6 scripts for load, stress, auth, and realtime testing.

## Scripts
- `load-testing.k6.js`: 500-concurrent-user mixed workload (dashboard + health + auth page + optional realtime).
- `auth-flow.k6.js`: Supabase password auth flow (requires env vars).
- `realtime-subscriptions.k6.js`: WebSocket realtime subscription soak (requires `REALTIME_URL`).
- `stress-testing.k6.js`: Stress ramp to breaking point.

## Environment Variables
Set these as needed:
- `BASE_URL` (default `http://localhost:5173`)
- `HEALTH_URL` (default `${BASE_URL}/api/health`)
- `REALTIME_URL` (e.g. `wss://<project>.supabase.co/realtime/v1/websocket?apikey=...`)
- `SUPABASE_URL` (e.g. `https://<project>.supabase.co`)
- `SUPABASE_ANON_KEY`
- `TEST_EMAIL`
- `TEST_PASSWORD`

## Example Runs
```bash
k6 run tests/performance/load-testing.k6.js
k6 run tests/performance/auth-flow.k6.js
k6 run tests/performance/realtime-subscriptions.k6.js
k6 run tests/performance/stress-testing.k6.js
```

## Notes
- Use a dedicated test user for `auth-flow.k6.js`.
- Realtime tests require an authenticated/authorized token in the `REALTIME_URL` query string.
- Adjust thresholds based on production SLAs.
