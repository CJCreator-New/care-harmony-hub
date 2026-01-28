import { createClient, RedisClientType } from 'redis';
import { config } from './environment';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;

export function connectRedis(): RedisClientType {
  if (!redisClient) {
    redisClient = createClient({
      url: config.REDIS_URL,
      password: config.REDIS_PASSWORD,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('end', () => {
      logger.info('Redis client disconnected');
    });
  }

  return redisClient;
}

export async function initRedis(): Promise<void> {
  const client = connectRedis();
  if (!client.isOpen) {
    await client.connect();
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.disconnect();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

export async function setCache(
  key: string,
  value: any,
  ttl?: number
): Promise<void> {
  const client = connectRedis();
  try {
    const serializedValue = JSON.stringify(value);
    if (ttl) {
      await client.setEx(key, ttl, serializedValue);
    } else {
      await client.set(key, serializedValue);
    }
  } catch (error) {
    logger.error({ msg: 'Redis set error', key, error });
    throw error;
  }
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  const client = connectRedis();
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error({ msg: 'Redis get error', key, error });
    throw error;
  }
}

export async function deleteCache(key: string): Promise<number> {
  const client = connectRedis();
  try {
    return await client.del(key);
  } catch (error) {
    logger.error({ msg: 'Redis delete error', key, error });
    throw error;
  }
}

export async function existsCache(key: string): Promise<boolean> {
  const client = connectRedis();
  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    logger.error({ msg: 'Redis exists error', key, error });
    throw error;
  }
}