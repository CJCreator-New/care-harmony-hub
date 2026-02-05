import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.02'],
  },
};

const SUPABASE_URL = __ENV.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';
const TEST_EMAIL = __ENV.TEST_EMAIL || '';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || '';

export default function () {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TEST_EMAIL || !TEST_PASSWORD) {
    sleep(1);
    return;
  }

  const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
  const payload = JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  const res = http.post(url, payload, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  check(res, {
    'auth status 200': (r) => r.status === 200,
    'auth has access_token': (r) => !!r.json('access_token'),
  });

  sleep(1);
}
