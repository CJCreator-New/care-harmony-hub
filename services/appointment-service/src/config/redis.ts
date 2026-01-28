import { createClient, RedisClientType } from 'redis';
import { config } from './environment';

let redisClient: RedisClientType;

export async function connectRedis(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) return redisClient;

  if (!config.REDIS_URL) {
    throw new Error('Redis URL not configured');
  }

  redisClient = createClient({
    url: config.REDIS_URL,
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error', err);
  });

  await redisClient.connect();
  return redisClient;
}

export async function setCache(
  key: string,
  value: any,
  ttlSeconds?: number
): Promise<void> {
  try {
    const client = await connectRedis();
    const serializedValue = JSON.stringify(value);

    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, serializedValue);
    } else {
      await client.set(key, serializedValue);
    }
  } catch (error) {
    console.error('Cache set error:', error);
    // Don't throw - cache failures shouldn't break the app
  }
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  try {
    const client = await connectRedis();
    const value = await client.get(key);

    if (!value) return null;

    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    const client = await connectRedis();
    await client.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
    // Don't throw - cache failures shouldn't break the app
  }
}