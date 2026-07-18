import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/index.js';
import { setupTestDb, cleanTestDb, teardownTestDb, getTestDb } from '../helpers/setup.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function makeToken(payload: { id: string; username: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET);
}

describe('Batches API - /api/admin/batches', () => {
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

  async function createClientWithAcceptedOrder() {
    const db = getTestDb();
    const [client] = await db('client')
      .insert({
        username: 'client1',
        password_hash: '$2b$10$fakehash',
        name: 'Test Client',
        whatsapp: '1234567890',
        role: 'client',
      })
      .returning('*');

    const [category] = await db('category')
      .insert({ name: 'Empanadas', display_order: 1, active: true })
      .returning('*');
    const [product] = await db('product')
      .insert({ name: 'Empanada de Carne', price: 350, category_id: category.id, active: true })
      .returning('*');

    const [order] = await db('order')
      .insert({
        client_id: client.id,
        total_amount: 700,
        status: 'accepted',
      })
      .returning('*');

    await db('order_item').insert({
      order_id: order.id,
      product_id: product.id,
      quantity: 2,
      unit_price: 350,
    });

    return { client, order };
  }

  it('should return 401 without authentication', async () => {
    const res = await request(app).get('/api/admin/batches');
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
      .get('/api/admin/batches')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('should create a batch from order IDs', async () => {
    const { token } = await createAdmin();
    const { order } = await createClientWithAcceptedOrder();

    const res = await request(app)
      .post('/api/admin/batches')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_ids: [order.id] });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('pending');
    expect(res.body.order_ids).toContain(order.id);
  });

  it('should return 400 when order_ids is empty', async () => {
    const { token } = await createAdmin();

    const res = await request(app)
      .post('/api/admin/batches')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_ids: [] });

    expect(res.status).toBe(400);
  });

  it('should return 400 when orders are not in accepted state', async () => {
    const { token } = await createAdmin();
    const db = getTestDb();

    const [client] = await db('client')
      .insert({
        username: 'client2',
        password_hash: '$2b$10$fakehash',
        name: 'Client 2',
        whatsapp: '1234567890',
        role: 'client',
      })
      .returning('*');

    const [order] = await db('order')
      .insert({ client_id: client.id, total_amount: 500, status: 'pending' })
      .returning('*');

    const res = await request(app)
      .post('/api/admin/batches')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_ids: [order.id] });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('accepted');
  });

  it('should update batch with estimated_minutes', async () => {
    const { token } = await createAdmin();
    const { order } = await createClientWithAcceptedOrder();

    // Create batch first
    const createRes = await request(app)
      .post('/api/admin/batches')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_ids: [order.id] });

    const batchId = createRes.body.id;

    // Update with estimated time
    const res = await request(app)
      .put(`/api/admin/batches/${batchId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estimated_minutes: 30 });

    expect(res.status).toBe(200);
    expect(res.body.estimated_minutes).toBe(30);
  });

  it('should mark batch as ready and set ready_at', async () => {
    const { token } = await createAdmin();
    const { order } = await createClientWithAcceptedOrder();

    const createRes = await request(app)
      .post('/api/admin/batches')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_ids: [order.id] });

    const batchId = createRes.body.id;

    const res = await request(app)
      .put(`/api/admin/batches/${batchId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'ready' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.ready_at).not.toBeNull();
  });

  it('should list batches with associated orders', async () => {
    const { token } = await createAdmin();
    const { order } = await createClientWithAcceptedOrder();

    await request(app)
      .post('/api/admin/batches')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_ids: [order.id] });

    const res = await request(app)
      .get('/api/admin/batches')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.batches).toHaveLength(1);
    expect(res.body.batches[0].orders).toHaveLength(1);
    expect(res.body.batches[0].orders[0].id).toBe(order.id);
  });

  it('should return 404 for non-existent batch', async () => {
    const { token } = await createAdmin();
    const res = await request(app)
      .put('/api/admin/batches/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ estimated_minutes: 15 });

    expect(res.status).toBe(404);
  });
});
