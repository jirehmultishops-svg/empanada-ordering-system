import db from './db/connection.js';

async function runMigrations() {
  console.log('Running database migrations...');
  try {
    const [batch, log] = await db.migrate.latest();
    if (log.length === 0) {
      console.log('Database already up to date.');
    } else {
      console.log(`Ran ${log.length} migration(s) in batch ${batch}:`);
      log.forEach((migration: string) => console.log(`  - ${migration}`));
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runMigrations();
