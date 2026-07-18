import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/index.js';
import { setupTestDb, cleanTestDb, teardownTestDb, getTestDb } from '../helpers/setup.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function makeToken(payload: { id: string; username: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET);
}

describe('Notifications API - /api/notifications', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanTestDb();
  });

  async function createClient() {
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
    return { client, token: makeToken({ id: client.id, username: client.username, role: 'client' }) };
  }

  it('should return 401 without authentication', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('should return empty notifications for new client', async () => {
    const { token } = await createClient();

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(0);
  });

  it('should return unread notifications', async () => {
    const { client, token } = await createClient();
    const db = getTestDb();

    await db('notification').insert([
      {
        client_id: client.id,
        type: 'order_accepted',
        message: 'Tu pedido fue aceptado',
        data: JSON.stringify({ order_id: '123' }),
        read: false,
      },
      {
        client_id: client.id,
        type: 'order_ready',
        message: 'Tu pedido está listo',
        data: JSON.stringify({ order_id: '123' }),
        read: false,
      },
      {
        client_id: client.id,
        type: 'old_notification',
        message: 'Already read',
        read: true,
      },
    ]);

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(2);
    expect(res.body.notifications[0].read).toBe(false);
  });

  it('should mark a notification as read', async () => {
    const { client, token } = await createClient();
    const db = getTestDb();

    const [notification] = await db('notification')
      .insert({
        client_id: client.id,
        type: 'order_accepted',
        message: 'Tu pedido fue aceptado',
        read: false,
      })
      .returning('*');

    const res = await request(app)
      .put(`/api/notifications/${notification.id}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.read).toBe(true);
  });

  it('should return 404 for non-existent notification', async () => {
    const { token } = await createClient();

    const res = await request(app)
      .put('/api/notifications/00000000-0000-0000-0000-000000000000/read')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('should not allow reading another client notification', async () => {
    const { token } = await createClient();
    const db = getTestDb();

    // Create another client and their notification
    const [otherClient] = await db('client')
      .insert({
        username: 'other',
        password_hash: '$2b$10$fakehash',
        name: 'Other Client',
        whatsapp: '9999999999',
        role: 'client',
      })
      .returning('*');

    const [notification] = await db('notification')
      .insert({
        client_id: otherClient.id,
        type: 'order_accepted',
        message: 'Tu pedido fue aceptado',
        read: false,
      })
      .returning('*');

    const res = await request(app)
      .put(`/api/notifications/${notification.id}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe('Notifications integration with orders', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanTestDb();
  });

  it('should create notification when order status changes to accepted', async () => {
    const db = getTestDb();

    const [admin] = await db('client')
      .insert({
        username: 'admin',
        password_hash: '$2b$10$fakehash',
        name: 'Admin',
        whatsapp: '1234567890',
        role: 'admin',
      })
      .returning('*');

    const [client] = await db('client')
      .insert({
        username: 'client1',
        password_hash: '$2b$10$fakehash',
        name: 'Client',
        whatsapp: '1234567890',
        role: 'client',
      })
      .returning('*');

    const [order] = await db('order')
      .insert({
        client_id: client.id,
        total_amount: 500,
        status: 'pending',
      })
      .returning('*');

    const adminToken = makeToken({ id: admin.id, username: admin.username, role: 'admin' });
    const clientToken = makeToken({ id: client.id, username: client.username, role: 'client' });

    // Accept the order
    const res = await request(app)
      .put(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'accepted' });

    expect(res.status).toBe(200);

    // Check client received notification
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.notifications.length).toBeGreaterThanOrEqual(1);
    const acceptedNotif = notifRes.body.notifications.find(
      (n: { type: string }) => n.type === 'order_accepted'
    );
    expect(acceptedNotif).toBeDefined();
    expect(acceptedNotif.message).toContain('aceptado');
  });

  it('should create notification when order is rejected', async () => {
    const db = getTestDb();

    const [admin] = await db('client')
      .insert({
        username: 'admin',
        password_hash: '$2b$10$fakehash',
        name: 'Admin',
        whatsapp: '1234567890',
        role: 'admin',
      })
      .returning('*');

    const [client] = await db('client')
      .insert({
        username: 'client1',
        password_hash: '$2b$10$fakehash',
        name: 'Client',
        whatsapp: '1234567890',
        role: 'client',
      })
      .returning('*');

    const [order] = await db('order')
      .insert({
        client_id: client.id,
        total_amount: 500,
        status: 'pending',
      })
      .returning('*');

    const adminToken = makeToken({ id: admin.id, username: admin.username, role: 'admin' });
    const clientToken = makeToken({ id: client.id, username: client.username, role: 'client' });

    // Reject the order
    await request(app)
      .put(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'rejected' });

    // Check client received notification
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(notifRes.status).toBe(200);
    const rejectedNotif = notifRes.body.notifications.find(
      (n: { type: string }) => n.type === 'order_rejected'
    );
    expect(rejectedNotif).toBeDefined();
    expect(rejectedNotif.message).toContain('rechazado');
  });
});
