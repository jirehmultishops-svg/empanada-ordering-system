import { beforeAll, afterAll, beforeEach } from 'vitest';

// Set NODE_ENV to test before anything else
process.env.NODE_ENV = 'test';

/**
 * Global test setup for vitest.
 * 
 * For integration tests that need the database, individual test files
 * should import and call setupTestDb/cleanTestDb/teardownTestDb from
 * tests/helpers/setup.ts.
 * 
 * This file sets the environment and can be extended with global hooks.
 */
