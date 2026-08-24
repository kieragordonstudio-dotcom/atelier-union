import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import type { AppConfig } from '../config.js';
import * as schema from './schema.js';

export type Database = NodePgDatabase<typeof schema>;

export type DatabaseContext = {
  db: Database;
  pool: Pool;
};

export function createDatabase(config: Pick<AppConfig, 'DATABASE_URL' | 'NODE_ENV'>) {
  const poolConfig: PoolConfig = {
    connectionString: config.DATABASE_URL,
    max: config.NODE_ENV === 'production' ? 10 : 5,
    idleTimeoutMillis: 30_000,
  };

  if (config.NODE_ENV === 'production') {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(poolConfig);
  return { pool, db: drizzle(pool, { schema }) } satisfies DatabaseContext;
}
