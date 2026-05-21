import { Pool } from 'pg';

let pool: Pool | null = null;

export function connectDatabase(): Pool {
  if (pool) return pool;

  const connectionString = process.env.MAIN_DB_URL || process.env.DATABASE_URL || process.env.PHARMACY_DB_URL;
  if (!connectionString) {
    throw new Error('No database connection string configured (MAIN_DB_URL or DATABASE_URL or PHARMACY_DB_URL)');
  }

  pool = new Pool({ connectionString });
  return pool;
}

export function closeDatabase(): Promise<void> {
  if (!pool) return Promise.resolve();
  return pool.end().then(() => { pool = null; });
}
