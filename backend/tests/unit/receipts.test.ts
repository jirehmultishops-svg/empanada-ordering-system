import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import path from 'path';
import { app } from '../../src/index.js';
import { setupTestDb, cleanTestDb, teardownTestDb, getTestDb } from '../helpers/setup.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function makeToken(payload: { id: string; username: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET);
}

describe('Receipts API - POST /api/orders/:id/receipt', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanTestDb();
  });

  async function createClientWithOrder() {
    const db = getTestDb();
    const [client] = await db('client')
      .insert({
        username: 'receiptclient',
        password_hash: '$2b$10$fakehashfortesting',
        name: 'Receipt Client',
        whatsapp: '1234567890',
        role: 'client',
      })
      .returning('*');

    const [category] = await db('category')
      .insert({ name: 'Empanadas', display_order: 1, active: true })
      .returning('*');

    const [product] = await db('product')
      .insert({
        name: 'Empanada de Carne',
        price: 500.0,
        category_id: category.id,
        active: true,
      })
      .returning('*');

    const [order] = await db('order')
      .insert({
        client_id: client.id,
        total_amount: 1500.0,
        status: 'pending',
      })
      .returning('*');

    await db('order_item').insert({
      order_id: order.id,
      product_id: product.id,
      quantity: 3,
      unit_price: 500.0,
    });

    const token = makeToken({ id: client.id, username: client.username, role: client.role });

    return { client, order, token };
  }

  async function createAdmin() {
    const db = getTestDb();
    const [admin] = await db('client')
      .insert({
        username: 'adminuser',
        password_hash: '$2b$10$fakehashfortesting',
        name: 'Admin User',
        whatsapp: '9876543210',
        role: 'admin',
      })
      .returning('*');

    const token = makeToken({ id: admin.id, username: admin.username, role: admin.role });
    return { admin, token };
  }

  it('should return 401 without authentication', async () => {
    const res = await request(app)
      .post('/api/orders/some-id/receipt')
      .attach('receipt', Buffer.from('fake-image'), 'receipt.png');
    expect(res.status).toBe(401);
  });

  it('should return 404 for non-existent order', async () => {
    const db = getTestDb();
    const [client] = await db('client')
      .insert({
        username: 'orphanclient',
        password_hash: '$2b$10$fakehashfortesting',
        name: 'Orphan',
        whatsapp: '1111111111',
        role: 'client',
      })
      .returning('*');

    const token = makeToken({ id: client.id, username: client.username, role: 'client' });

    const res = await request(app)
      .post('/api/orders/00000000-0000-0000-0000-000000000000/receipt')
      .set('Authorization', `Bearer ${token}`)
      .attach('receipt', Buffer.from('fake-image'), 'receipt.png');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Pedido no encontrado');
  });

  it('should return 403 when client tries to upload receipt for another client\'s order', async () => {
    const { order } = await createClientWithOrder();

    // Create another client
    const db = getTestDb();
    const [otherClient] = await db('client')
      .insert({
        username: 'otherclient',
        password_hash: '$2b$10$fakehashfortesting',
        name: 'Other Client',
        whatsapp: '5555555555',
        role: 'client',
      })
      .returning('*');

    const otherToken = makeToken({ id: otherClient.id, username: otherClient.username, role: 'client' });

    const res = await request(app)
      .post(`/api/orders/${order.id}/receipt`)
      .set('Authorization', `Bearer ${otherToken}`)
      .attach('receipt', Buffer.from('fake-image'), 'receipt.png');

    expect(res.status).toBe(403);
  });

  it('should return 400 when no image file is provided', async () => {
    const { order, token } = await createClientWithOrder();

    const res = await request(app)
      .post(`/api/orders/${order.id}/receipt`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Se requiere una imagen del comprobante');
  });

  it('should upload receipt and return 201 with processing status', async () => {
    const { order, token } = await createClientWithOrder();

    const res = await request(app)
      .post(`/api/orders/${order.id}/receipt`)
      .set('Authorization', `Bearer ${token}`)
      .attach('receipt', Buffer.from('fake-image-data'), 'comprobante.png');

    expect(res.status).toBe(201);
    expect(res.body.order_id).toBe(order.id);
    expect(res.body.ocr_status).toBe('processing');
    expect(res.body.verified).toBe(false);
    expect(res.body.image_url).toMatch(/^\/uploads\/receipt-.*\.png$/);
    expect(res.body.id).toBeDefined();
    expect(res.body.uploaded_at).toBeDefined();
  });

  it('should store the receipt record in the database', async () => {
    const { order, token } = await createClientWithOrder();

    await request(app)
      .post(`/api/orders/${order.id}/receipt`)
      .set('Authorization', `Bearer ${token}`)
      .attach('receipt', Buffer.from('fake-image-data'), 'recibo.jpg');

    const db = getTestDb();
    const receipts = await db('receipt').where({ order_id: order.id });
    expect(receipts).toHaveLength(1);
    expect(receipts[0].ocr_status).toBe('processing');
    expect(receipts[0].verified).toBe(false);
    expect(receipts[0].image_url).toMatch(/^\/uploads\/receipt-/);
  });
});

describe('Receipts API - PUT /api/orders/:id/receipt/verify (admin)', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanTestDb();
  });

  async function createOrderWithReceipt() {
    const db = getTestDb();
    const [client] = await db('client')
      .insert({
        username: 'verifyclient',
        password_hash: '$2b$10$fakehashfortesting',
        name: 'Verify Client',
        whatsapp: '1234567890',
        role: 'client',
      })
      .returning('*');

    const [order] = await db('order')
      .insert({
        client_id: client.id,
        total_amount: 2000.0,
        status: 'pending',
      })
      .returning('*');

    const [receipt] = await db('receipt')
      .insert({
        order_id: order.id,
        image_url: '/uploads/receipt-test.png',
        ocr_status: 'manual_review',
        verified: false,
      })
      .returning('*');

    const clientToken = makeToken({ id: client.id, username: client.username, role: 'client' });

    return { client, order, receipt, clientToken };
  }

  async function createAdmin() {
    const db = getTestDb();
    const [admin] = await db('client')
      .insert({
        username: 'verifyadmin',
        password_hash: '$2b$10$fakehashfortesting',
        name: 'Admin',
        whatsapp: '9876543210',
        role: 'admin',
      })
      .returning('*');

    const token = makeToken({ id: admin.id, username: admin.username, role: admin.role });
    return { admin, token };
  }

  it('should return 401 without authentication', async () => {
    const res = await request(app)
      .put('/api/orders/some-id/receipt/verify')
      .send({ verified: true });
    expect(res.status).toBe(401);
  });

  it('should return 403 for non-admin users', async () => {
    const { order, clientToken } = await createOrderWithReceipt();

    const res = await request(app)
      .put(`/api/orders/${order.id}/receipt/verify`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ verified: true });

    expect(res.status).toBe(403);
  });

  it('should return 400 when verified field is missing', async () => {
    const { order } = await createOrderWithReceipt();
    const { token } = await createAdmin();

    const res = await request(app)
      .put(`/api/orders/${order.id}/receipt/verify`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('El campo "verified" (boolean) es requerido');
  });

  it('should return 404 for non-existent order', async () => {
    const { token } = await createAdmin();

    const res = await request(app)
      .put('/api/orders/00000000-0000-0000-0000-000000000000/receipt/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ verified: true });

    expect(res.status).toBe(404);
  });

  it('should return 404 when order has no receipt', async () => {
    const db = getTestDb();
    const [client] = await db('client')
      .insert({
        username: 'noreceipt',
        password_hash: '$2b$10$fakehashfortesting',
        name: 'No Receipt',
        whatsapp: '1112223333',
        role: 'client',
      })
      .returning('*');

    const [order] = await db('order')
      .insert({ client_id: client.id, total_amount: 100, status: 'pending' })
      .returning('*');

    const { token } = await createAdmin();

    const res = await request(app)
      .put(`/api/orders/${order.id}/receipt/verify`)
      .set('Authorization', `Bearer ${token}`)
      .send({ verified: true });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('No se encontró comprobante para este pedido');
  });

  it('should verify receipt manually (verified=true)', async () => {
    const { order } = await createOrderWithReceipt();
    const { token } = await createAdmin();

    const res = await request(app)
      .put(`/api/orders/${order.id}/receipt/verify`)
      .set('Authorization', `Bearer ${token}`)
      .send({ verified: true, extracted_amount: 2000.0 });

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.ocr_status).toBe('completed');
    expect(res.body.extracted_amount).toBe(2000.0);
  });

  it('should reject receipt manually (verified=false)', async () => {
    const { order } = await createOrderWithReceipt();
    const { token } = await createAdmin();

    const res = await request(app)
      .put(`/api/orders/${order.id}/receipt/verify`)
      .set('Authorization', `Bearer ${token}`)
      .send({ verified: false, extracted_amount: 1500.0 });

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(false);
    expect(res.body.ocr_status).toBe('completed');
    expect(res.body.extracted_amount).toBe(1500.0);
  });

  it('should allow verification without specifying extracted_amount', async () => {
    const { order } = await createOrderWithReceipt();
    const { token } = await createAdmin();

    const res = await request(app)
      .put(`/api/orders/${order.id}/receipt/verify`)
      .set('Authorization', `Bearer ${token}`)
      .send({ verified: true });

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.ocr_status).toBe('completed');
  });
});

describe('OCR Service - processReceipt', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanTestDb();
  });

  it('should mark receipt as manual_review when OCR fails (default behavior)', async () => {
    const db = getTestDb();
    const { processReceipt } = await import('../../src/services/ocr.js');

    const [client] = await db('client')
      .insert({
        username: 'ocrclient',
        password_hash: '$2b$10$fakehashfortesting',
        name: 'OCR Client',
        whatsapp: '1234567890',
        role: 'client',
      })
      .returning('*');

    const [order] = await db('order')
      .insert({
        client_id: client.id,
        total_amount: 1000.0,
        status: 'pending',
      })
      .returning('*');

    const [receipt] = await db('receipt')
      .insert({
        order_id: order.id,
        image_url: '/uploads/receipt-test.png',
        ocr_status: 'processing',
        verified: false,
      })
      .returning('*');

    await processReceipt(receipt.id);

    const updatedReceipt = await db('receipt').where({ id: receipt.id }).first();
    expect(updatedReceipt.ocr_status).toBe('manual_review');
    expect(updatedReceipt.verified).toBe(false);
  });

  it('should handle non-existent receipt gracefully', async () => {
    const { processReceipt } = await import('../../src/services/ocr.js');
    // Should not throw
    await processReceipt('00000000-0000-0000-0000-000000000000');
  });
});
