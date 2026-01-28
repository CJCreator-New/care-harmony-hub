#!/usr/bin/env node

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { query } from './src/config/database';
import { logger } from './src/utils/logger';

async function runMigrations(): Promise<void> {
  try {
    logger.info('Starting database migrations...');

    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get executed migrations
    const executedResult = await query('SELECT version FROM schema_migrations ORDER BY version');
    const executedMigrations = new Set(executedResult.rows.map(row => row.version));

    // Get migration files
    const migrationsDir = join(__dirname, 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const version = file.split('_')[0];

      if (executedMigrations.has(version)) {
        logger.info(`Migration ${file} already executed, skipping...`);
        continue;
      }

      logger.info(`Executing migration: ${file}`);

      const migrationPath = join(migrationsDir, file);
      const migrationSQL = readFileSync(migrationPath, 'utf8');

      // Execute migration in a transaction
      await query('BEGIN');

      try {
        await query(migrationSQL);

        // Record migration execution
        await query(
          'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
          [version, file]
        );

        await query('COMMIT');
        logger.info(`Migration ${file} executed successfully`);
      } catch (error) {
        await query('ROLLBACK');
        logger.error({ msg: `Migration ${file} failed`, error });
        throw error;
      }
    }

    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error({ msg: 'Migration process failed', error });
    process.exit(1);
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export { runMigrations };