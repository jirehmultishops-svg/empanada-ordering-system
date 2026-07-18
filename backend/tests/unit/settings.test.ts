import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/index.js';
import { setupTestDb, cleanTestDb, teardownTestDb, getTestDb } from '../helpers/setup.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function makeToken(payload: { id: string; username: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET);
}

describe('Settings API - /api/admin/settings', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanTestDb();
  });

  async function createAdmin() {
    const db = getTestDb();
    const [admin] = await db('client')
      .insert({
        username: 'admin',
        password_hash: '$2b$10$fakehash',
        name: 'Admin User',
        whatsapp: '1234567890',
        role: 'admin',
      })
      .returning('*');
    return { admin, token: makeToken({ id: admin.id, username: admin.username, role: 'admin' }) };
  }

  it('should return 401 without authentication', async () => {
    const res = await request(app).get('/api/admin/settings/delivery-mode');
    expect(res.status).toBe(401);
  });

  it('should return 403 for non-admin users', async () => {
    const db = getTestDb();
    const [client] = await db('client')
      .insert({
        username: 'client1',
        password_hash: '$2b$10$fakehash',
        name: 'Client',
        whatsapp: '1234567890',
        role: 'client',
      })
      .returning('*');
    const token = makeToken({ id: client.id, username: client.username, role: 'client' });

    const res = await request(app)
      .get('/api/admin/settings/delivery-mode')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('should get current delivery mode (default: slots)', async () => {
    const { token } = await createAdmin();
    const db = getTestDb();

    // Ensure settings table has default value
    await db('settings').insert({ key: 'delivery_mode', value: 'slots' }).onConflict('key').merge();

    const res = await request(app)
      .get('/api/admin/settings/delivery-mode')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('slots');
  });

  it('should set delivery mode to batches', async () => {
    const { token } = await createAdmin();
    const db = getTestDb();

    // Ensure settings table has default value
    await db('settings').insert({ key: 'delivery_mode', value: 'slots' }).onConflict('key').merge();

    const res = await request(app)
      .put('/api/admin/settings/delivery-mode')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'batches' });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('batches');

    // Verify persistence
    const getRes = await request(app)
      .get('/api/admin/settings/delivery-mode')
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.body.mode).toBe('batches');
  });

  it('should set delivery mode to slots', async () => {
    const { token } = await createAdmin();
    const db = getTestDb();

    await db('settings').insert({ key: 'delivery_mode', value: 'batches' }).onConflict('key').merge();

    const res = await request(app)
      .put('/api/admin/settings/delivery-mode')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'slots' });

    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('slots');
  });

  it('should reject invalid mode', async () => {
    const { token } = await createAdmin();

    const res = await request(app)
      .put('/api/admin/settings/delivery-mode')
      .set('Authorization', `Bearer ${token}`)
      .send({ mode: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Modo inválido');
  });

  it('should reject missing mode', async () => {
    const { token } = await createAdmin();

    const res = await request(app)
      .put('/api/admin/settings/delivery-mode')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});
