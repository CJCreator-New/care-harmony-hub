import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  vus: 150,
  duration: '5m',
  thresholds: {
    'ws_connecting': ['p(95)<1000'],
  },
};

const REALTIME_URL = __ENV.REALTIME_URL || '';

export default function () {
  if (!REALTIME_URL) {
    sleep(1);
    return;
  }

  const res = ws.connect(REALTIME_URL, { tags: { name: 'realtime' } }, (socket) => {
    socket.on('open', () => {
      socket.send(JSON.stringify({ event: 'phx_join', topic: 'realtime:public:appointments', payload: {}, ref: '1' }));
    });

    socket.on('message', () => {});

    socket.setTimeout(() => {
      socket.close();
    }, 5000);
  });

  check(res, { 'realtime connected': (r) => r && r.status === 101 });
  sleep(1);
}
