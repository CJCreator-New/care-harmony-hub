# Performance tests

This folder holds k6 load scripts. They are run by hand against a deployed
environment; nothing here runs in CI. k6 is not an npm dependency: install it
separately (https://k6.io/docs/get-started/installation/).

There are no Vitest performance tests. The earlier ones measured an in-file
mock database and checked that config files existed, so they were removed.

## load-test.js

Ramps to 100 virtual users over clinical workflows (patient list, prescriptions,
lab orders, billing, audit queries, scheduling).

Thresholds: HTTP p95 < 500 ms, p99 < 1000 ms, error rate < 1 %.

```bash
npm run test:load
```

```bash
k6 run --env BASE_URL=<app url> --env API_URL=<supabase rest url> --env SUPABASE_KEY=<anon key> tests/performance/load-test.js
```

Never point a load test at production.

## Other scripts

`auth-flow.k6.js`, `load-testing.k6.js`, `phase4c-load-test.js`,
`realtime-subscriptions.k6.js` and `stress-testing.k6.js` have no npm script.
Read each file for the environment variables it expects before running it.
