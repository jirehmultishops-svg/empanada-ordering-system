import knex, { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Creates a Knex instance configured for the test database.
 */
function createTestDb(): Knex {
  return knex({
    client: 'pg',
    connection: process.env.DATABASE_URL_TEST || {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME_TEST || 'empanadas_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
    migrations: {
      directory: './src/db/migrations',
      extension: 'ts',
    },
  });
}

let testDb: Knex;

/**
 * Returns the shared test database instance.
 */
export function getTestDb(): Knex {
  if (!testDb) {
    testDb = createTestDb();
  }
  return testDb;
}

/**
 * Runs all migrations on the test database.
 * Call this in beforeAll() or a global setup.
 */
export async function setupTestDb(): Promise<void> {
  testDb = getTestDb();
  await testDb.migrate.latest();
}

/**
 * Truncates all tables in the correct order (respecting FK constraints).
 * Call this in beforeEach() to ensure test isolation.
 */
export async function cleanTestDb(): Promise<void> {
  const db = getTestDb();
  await db.raw(`
    TRUNCATE TABLE
      notification,
      receipt,
      order_item,
      "order",
      batch,
      time_slot,
      cart_item,
      cart,
      client,
      product,
      category,
      settings
    CASCADE
  `);
}

/**
 * Rolls back all migrations and destroys the connection.
 * Call this in afterAll() or a global teardown.
 */
export async function teardownTestDb(): Promise<void> {
  const db = getTestDb();
  await db.migrate.rollback(undefined, true);
  await db.destroy();
}
