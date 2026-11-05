import { Pool, PoolClient } from 'pg';
import { config } from './environment';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

export function connectDatabase(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: config.DATABASE_SSL,
      max: config.DATABASE_MAX_CONNECTIONS,
    });

    pool.on('connect', (client: PoolClient) => {
      logger.info('New database client connected');
    });

    pool.on('error', (err: Error, client: PoolClient) => {
      logger.error({ msg: 'Unexpected error on idle client', err });
    });

    pool.on('remove', (client: PoolClient) => {
      logger.info('Database client removed from pool');
    });
  }

  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const client = connectDatabase();
  try {
    const result = await client.query(text, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
    };
  } catch (error) {
    logger.error({ msg: 'Database query error', text, params, error });
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  const pool = connectDatabase();
  const client = await pool.connect();
  return client;
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ msg: 'Transaction failed', error });
    throw error;
  } finally {
    client.release();
  }
}