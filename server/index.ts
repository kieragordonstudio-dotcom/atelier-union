import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createDatabase } from './db/database.js';

const config = loadConfig();
const context = createDatabase(config);
const app = createApp(config, context);
const server = app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`Atelier Union server listening on port ${config.PORT}.`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received. Closing server.`);
  server.close(async () => {
    await context.pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
