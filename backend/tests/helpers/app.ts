import supertest from 'supertest';
import { app } from '../../src/index.js';

/**
 * Pre-configured supertest agent for integration tests.
 * Uses the Express app without starting the HTTP server.
 */
export const request = supertest(app);

export { app };
