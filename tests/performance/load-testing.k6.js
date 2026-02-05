import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import ws from 'k6/ws';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '3m', target: 250 },
    { duration: '5m', target: 500 },
    { duration: '5m', target: 500 },
    { duration: '3m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<3000'],
    http_req_failed: ['rate<0.02'],
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const HEALTH_URL = __ENV.HEALTH_URL || `${BASE_URL}/api/health`;
const REALTIME_URL = __ENV.REALTIME_URL || '';

function hitDashboard() {
  const res = http.get(`${BASE_URL}/dashboard`);
  check(res, {
    'dashboard status 200 or 302': (r) => r.status === 200 || r.status === 302,
    'dashboard < 2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);
}

function hitAuthFlow() {
  const res = http.get(`${BASE_URL}/hospital/login`);
  check(res, {
    'login page status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
}

function hitHealthCheck() {
  const res = http.get(HEALTH_URL);
  check(res, {
    'health endpoint ok': (r) => r.status === 200 || r.status === 206,
  }) || errorRate.add(1);
}

function simulateRealtimeSubscription() {
  if (!REALTIME_URL) {
    return;
  }

  ws.connect(REALTIME_URL, { tags: { name: 'realtime' } }, (socket) => {
    socket.on('open', () => {
      socket.send(JSON.stringify({ event: 'phx_join', topic: 'realtime:public:appointments', payload: {}, ref: '1' }));
    });

    socket.on('message', () => {
      // no-op, just keep the connection alive for sampling
    });

    socket.setTimeout(() => {
      socket.close();
    }, 3000);
  });
}

export default function () {
  let res = http.get(`${BASE_URL}/`);
  check(res, {
    'homepage status 200': (r) => r.status === 200,
    'homepage < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  hitAuthFlow();
  hitDashboard();
  hitHealthCheck();
  simulateRealtimeSubscription();

  sleep(1);
}
