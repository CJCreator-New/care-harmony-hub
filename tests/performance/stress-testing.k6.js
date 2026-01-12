import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Normal load
    { duration: '5m', target: 100 },   
    { duration: '2m', target: 500 },   // Stress level
    { duration: '5m', target: 500 },   
    { duration: '2m', target: 1000 },  // Breaking point
    { duration: '5m', target: 1000 },  
    { duration: '5m', target: 0 },     // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'],  // 99% under 2s during stress
    http_req_failed: ['rate<0.05'],     // Error rate under 5%
  },
};

const BASE_URL = 'http://localhost:5173';

export default function () {
  const responses = http.batch([
    ['GET', `${BASE_URL}/`],
    ['GET', `${BASE_URL}/login`],
    ['GET', `${BASE_URL}/dashboard`],
  ]);

  responses.forEach((res) => {
    check(res, {
      'status is 200 or 302': (r) => r.status === 200 || r.status === 302,
    });
  });

  sleep(1);
}
