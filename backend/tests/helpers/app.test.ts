import { describe, it, expect } from 'vitest';
import { request } from './app.js';

describe('App Test Helper', () => {
  it('should expose the health endpoint via supertest', async () => {
    const res = await request.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});
