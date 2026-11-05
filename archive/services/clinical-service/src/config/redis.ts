import { createClient, RedisClientType } from 'redis';
import { config } from './environment';

let client: RedisClientType | undefined;

export async function connectRedis(): Promise<RedisClientType> {
  if (client && client.isOpen) return client;

  client = createClient({
    url: config.REDIS_URL,
  });

  client.on('error', (err) => {
    console.error('Redis Client Error', err);
  });

  client.on('connect', () => {
    console.log('Connected to Redis');
  });

  await client.connect();
  return client;
}

export async function setCache(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
  const redis = await connectRedis();
  await redis.setEx(key, ttlSeconds, JSON.stringify(value));
}

export async function getCache<T>(key: string): Promise<T | null> {
  const redis = await connectRedis();
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
}

export async function deleteCache(key: string): Promise<void> {
  const redis = await connectRedis();
  await redis.del(key);
}

export async function closeRedis(): Promise<void> {
  if (client && client.isOpen) {
    await client.quit();
    client = undefined;
  }
}

// Export client for backward compatibility
export { client as redis };