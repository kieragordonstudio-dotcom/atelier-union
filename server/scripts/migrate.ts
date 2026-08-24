import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { loadConfig } from '../config.js';
import { createDatabase } from '../db/database.js';

const config = loadConfig();
const { db, pool } = createDatabase(config);

try {
  await migrate(db, { migrationsFolder: './migrations' });
  console.log('Database migrations complete.');
} finally {
  await pool.end();
}
