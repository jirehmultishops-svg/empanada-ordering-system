import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/index.js';
import { setupTestDb, cleanTestDb, teardownTestDb, getTestDb } from '../helpers/setup.js';
import { validateTransition, VALID_TRANSITIONS } from '../../src/routes/orders.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function makeToken(payload: { id: string; username: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET);
}

describe('Orders API - POST /api/orders', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanTestDb();
  });

  async function createClientWithCart() {
    const db = getTestDb();
    const [client] = await db('client')
      .insert({
        username: 'testclient',
        password_hash: '$2b$10$fakehashfortesting',
        name: 'Test Client',
        whatsapp: '1234567890',
        role: 'client',
      })
      .returning('*');

    const [cart] = await db('cart')
      .insert({ client_id: client.id })
      .returning('*');

    const token = makeToken({ id: client.id, username: client.username, role: client.role });

    return { client, cart, token };
  }

  async function createCategory() {
    const db = getTestDb();
    const [cat] = await db('category')
      .insert({ name: 'Empanadas', display_order: 1, active: true })
      .returning('*');
    return cat;
  }

  async function createProduct(categoryId: string, overrides: Record<string, unknown> = {}) {
    const db = getTestDb();
    const [product] = await db('product')
      .insert({
        name: 'Empanada de Carne',
        price: 350.00,
        category_id: categoryId,
        active: true,
        ...overrides,
      })
      .returning('*');
    return product;
  }

  it('should return 401 without authentication', async () => {
    const res = await request(app).post('/api/orders').send({});
    expect(res.status).toBe(401);
  });

  it('should return 400 when cart is empty', async () => {
    const { token } = await createClientWithCart();

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Debés agregar al menos un producto');
  });

  it('should create order from cart with correct data', async () => {
    const { token, cart } = await createClientWithCart();
    const category = await createCategory();
    const product1 = await createProduct(category.id, { name: 'Empanada de Carne', price: 350 });
    const product2 = await createProduct(category.id, { name: 'Empanada de Pollo', price: 400 });

    const db = getTestDb();
    await db('cart_item').insert([
      { cart_id: cart.id, product_id: product1.id, quantity: 2 },
      { cart_id: cart.id, product_id: product2.id, quantity: 3 },
    ]);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ pickup_suggestion: '18:00' });

    expect(res.status).toBe(201);
    expect(res.body.order).toBeDefined();
    expect(res.body.order.status).toBe('pending');
    expect(res.body.order.total_amount).toBe(1900); // 350*2 + 400*3
    expect(res.body.order.pickup_suggestion).toBe('18:00');
    expect(res.body.order.items).toHaveLength(2);
    expect(res.body.bank_transfer).toBeDefined();
    expect(res.body.bank_transfer.alias).toBe('empanadas.alias');
    expect(res.body.bank_transfer.cbu).toBe('0000000000000000000000');
  });

  it('should copy current product price to order item unit_price', async () => {
    const { token, cart } = await createClientWithCart();
    const category = await createCategory();
    const product = await createProduct(category.id, { name: 'Empanada Premium', price: 500 });

    const db = getTestDb();
    await db('cart_item').insert({ cart_id: cart.id, product_id: product.id, quantity: 1 });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(201);
    const orderItem = res.body.order.items[0];
    expect(orderItem.unit_price).toBe(500);
    expect(orderItem.product_id).toBe(product.id);
  });

  it('should empty the cart after creating order', async () => {
    const { token, cart } = await createClientWithCart();
    const category = await createCategory();
    const product = await createProduct(category.id);

    const db = getTestDb();
    await db('cart_item').insert({ cart_id: cart.id, product_id: product.id, quantity: 2 });

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    // Verify cart is now empty
    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(cartRes.status).toBe(200);
    expect(cartRes.body.items).toHaveLength(0);
    expect(cartRes.body.total).toBe(0);
  });

  it('should work without pickup_suggestion', async () => {
    const { token, cart } = await createClientWithCart();
    const category = await createCategory();
    const product = await createProduct(category.id);

    const db = getTestDb();
    await db('cart_item').insert({ cart_id: cart.id, product_id: product.id, quantity: 1 });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.order.pickup_suggestion).toBeNull();
  });

  it('should persist order in database', async () => {
    const { token, cart, client } = await createClientWithCart();
    const category = await createCategory();
    const product = await createProduct(category.id, { price: 250 });

    const db = getTestDb();
    await db('cart_item').insert({ cart_id: cart.id, product_id: product.id, quantity: 4 });

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ pickup_suggestion: '19:30' });

    expect(res.status).toBe(201);

    // Verify in database
    const dbOrder = await db('order').where({ id: res.body.order.id }).first();
    expect(dbOrder).toBeDefined();
    expect(dbOrder.client_id).toBe(client.id);
    expect(parseFloat(dbOrder.total_amount)).toBe(1000);
    expect(dbOrder.status).toBe('pending');

    const dbItems = await db('order_item').where({ order_id: dbOrder.id });
    expect(dbItems).toHaveLength(1);
    expect(dbItems[0].quantity).toBe(4);
    expect(parseFloat(dbItems[0].unit_price)).toBe(250);
  });
});


describe('validateTransition - Unit Tests', () => {
  it('should allow pending → accepted', () => {
    const result = validateTransition('pending', 'accepted');
    expect(result).toEqual({ valid: true });
  });

  it('should allow pending → rejected', () => {
    const result = validateTransition('pending', 'rejected');
    expect(result).toEqual({ valid: true });
  });

  it('should allow accepted → ready', () => {
    const result = validateTransition('accepted', 'ready');
    expect(result).toEqual({ valid: true });
  });

  it('should reject pending → ready', () => {
    const result = validateTransition('pending', 'ready');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('pending');
      expect(result.message).toContain('ready');
    }
  });

  it('should reject accepted → rejected', () => {
    const result = validateTransition('accepted', 'rejected');
    expect(result.valid).toBe(false);
  });

  it('should reject accepted → pending', () => {
    const result = validateTransition('accepted', 'pending');
    expect(result.valid).toBe(false);
  });

  it('should reject rejected → any state', () => {
    expect(validateTransition('rejected', 'pending').valid).toBe(false);
    expect(validateTransition('rejected', 'accepted').valid).toBe(false);
    expect(validateTransition('rejected', 'ready').valid).toBe(false);
  });

  it('should reject ready → any state', () => {
    expect(validateTransition('ready', 'pending').valid).toBe(false);
    expect(validateTransition('ready', 'accepted').valid).toBe(false);
    expect(validateTransition('ready', 'rejected').valid).toBe(false);
  });

  it('should reject unknown source state', () => {
    const result = validateTransition('unknown', 'accepted');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain('ninguna');
    }
  });

  it('should list valid transitions in error message', () => {
    const result = validateTransition('pending', 'ready');
    if (!result.valid) {
      expect(result.message).toContain('accepted');
      expect(result.message).toContain('rejected');
    }
  });
});

describe('Orders API - PUT /api/orders/:id/status', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanTestDb();
  });

  async function createAdminAndClient() {
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

    const [client] = await db('client')
      .insert({
        username: 'client1',
        password_hash: '$2b$10$fakehash',
        name: 'Client User',
        whatsapp: '1234567891',
        role: 'client',
      })
      .returning('*');

    const adminToken = makeToken({ id: admin.id, username: admin.username, role: admin.role });
    const clientToken = makeToken({ id: client.id, username: client.username, role: client.role });

    return { admin, client, adminToken, clientToken };
  }

  async function createOrder(clientId: string, status = 'pending') {
    const db = getTestDb();
    const [category] = await db('category')
      .insert({ name: 'Empanadas', display_order: 1, active: true })
      .returning('*');
    const [product] = await db('product')
      .insert({ name: 'Empanada de Carne', price: 350, category_id: category.id, active: true })
      .returning('*');
    const [order] = await db('order')
      .insert({
        client_id: clientId,
        total_amount: 700,
        status,
        pickup_suggestion: '18:00',
      })
      .returning('*');
    await db('order_item').insert({
      order_id: order.id,
      product_id: product.id,
      quantity: 2,
      unit_price: 350,
    });
    return { order, product, category };
  }

  it('should return 401 without authentication', async () => {
    const res = await request(app).put('/api/orders/some-id/status').send({ status: 'accepted' });
    expect(res.status).toBe(401);
  });

  it('should return 403 for non-admin users', async () => {
    const { clientToken } = await createAdminAndClient();
    const res = await request(app)
      .put('/api/orders/some-id/status')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ status: 'accepted' });
    expect(res.status).toBe(403);
  });

  it('should return 404 for non-existent order', async () => {
    const { adminToken } = await createAdminAndClient();
    const res = await request(app)
      .put('/api/orders/00000000-0000-0000-0000-000000000000/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'accepted' });
    expect(res.status).toBe(404);
  });

  it('should return 400 when status is missing', async () => {
    const { adminToken, client } = await createAdminAndClient();
    const { order } = await createOrder(client.id);
    const res = await request(app)
      .put(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('should accept valid transition pending → accepted', async () => {
    const { adminToken, client } = await createAdminAndClient();
    const { order } = await createOrder(client.id, 'pending');

    const res = await request(app)
      .put(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'accepted' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
    expect(res.body.id).toBe(order.id);
  });

  it('should accept valid transition pending → rejected', async () => {
    const { adminToken, client } = await createAdminAndClient();
    const { order } = await createOrder(client.id, 'pending');

    const res = await request(app)
      .put(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
  });

  it('should accept valid transition accepted → ready', async () => {
    const { adminToken, client } = await createAdminAndClient();
    const { order } = await createOrder(client.id, 'accepted');

    const res = await request(app)
      .put(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ready' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  it('should reject invalid transition pending → ready with 422', async () => {
    const { adminToken, client } = await createAdminAndClient();
    const { order } = await createOrder(client.id, 'pending');

    const res = await request(app)
      .put(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ready' });

    expect(res.status).toBe(422);
    expect(res.body.message).toContain('Transición inválida');
  });

  it('should reject invalid transition accepted → rejected with 422', async () => {
    const { adminToken, client } = await createAdminAndClient();
    const { order } = await createOrder(client.id, 'accepted');

    const res = await request(app)
      .put(`/api/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(422);
    expect(res.body.message).toContain('Transición inválida');
  });
});

describe('Orders API - GET /api/orders (admin)', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanTestDb();
  });

  async function seedData() {
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
    const [client] = await db('client')
      .insert({
        username: 'client1',
        password_hash: '$2b$10$fakehash',
        name: 'María García',
        whatsapp: '5491112345678',
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
        status: 'pending',
        pickup_suggestion: '18:00',
      })
      .returning('*');
    await db('order_item').insert({
      order_id: order.id,
      product_id: product.id,
      quantity: 2,
      unit_price: 350,
    });

    const adminToken = makeToken({ id: admin.id, username: admin.username, role: admin.role });
    const clientToken = makeToken({ id: client.id, username: client.username, role: client.role });

    return { admin, client, category, product, order, adminToken, clientToken };
  }

  it('should return 401 without authentication', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  it('should return 403 for non-admin users', async () => {
    const { clientToken } = await seedData();
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(403);
  });

  it('should list all orders for admin with complete details', async () => {
    const { adminToken, client, product } = await seedData();

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
    const order = res.body.orders[0];
    expect(order.client_name).toBe('María García');
    expect(order.client_whatsapp).toBe('5491112345678');
    expect(order.total_amount).toBe(700);
    expect(order.status).toBe('pending');
    expect(order.pickup_suggestion).toBe('18:00');
    expect(order.items).toHaveLength(1);
    expect(order.items[0].name).toBe('Empanada de Carne');
    expect(order.items[0].quantity).toBe(2);
    expect(order.items[0].unit_price).toBe(350);
    expect(order.receipt).toBeNull();
  });

  it('should filter orders by status', async () => {
    const { adminToken, client } = await seedData();
    const db = getTestDb();

    // Create an accepted order
    const [category] = await db('category')
      .insert({ name: 'Bebidas', display_order: 2, active: true })
      .returning('*');
    const [product2] = await db('product')
      .insert({ name: 'Coca Cola', price: 200, category_id: category.id, active: true })
      .returning('*');
    await db('order').insert({
      client_id: client.id,
      total_amount: 200,
      status: 'accepted',
      pickup_suggestion: '19:00',
    });

    const res = await request(app)
      .get('/api/orders?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
    expect(res.body.orders[0].status).toBe('pending');
  });

  it('should include receipt information when available', async () => {
    const { adminToken, order } = await seedData();
    const db = getTestDb();

    await db('receipt').insert({
      order_id: order.id,
      image_url: '/uploads/receipt1.jpg',
      extracted_amount: 700,
      ocr_status: 'completed',
      verified: true,
    });

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const orderData = res.body.orders[0];
    expect(orderData.receipt).not.toBeNull();
    expect(orderData.receipt.image_url).toBe('/uploads/receipt1.jpg');
    expect(orderData.receipt.ocr_status).toBe('completed');
    expect(orderData.receipt.verified).toBe(true);
    expect(orderData.receipt.extracted_amount).toBe(700);
  });
});

describe('Orders API - GET /api/orders/my (client)', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanTestDb();
  });

  async function seedClientOrders() {
    const db = getTestDb();
    const [client] = await db('client')
      .insert({
        username: 'client1',
        password_hash: '$2b$10$fakehash',
        name: 'Juan Pérez',
        whatsapp: '5491112345678',
        role: 'client',
      })
      .returning('*');
    const [otherClient] = await db('client')
      .insert({
        username: 'client2',
        password_hash: '$2b$10$fakehash',
        name: 'Otro Cliente',
        whatsapp: '5491199999999',
        role: 'client',
      })
      .returning('*');
    const [category] = await db('category')
      .insert({ name: 'Empanadas', display_order: 1, active: true })
      .returning('*');
    const [product] = await db('product')
      .insert({ name: 'Empanada de Carne', price: 350, category_id: category.id, active: true })
      .returning('*');

    // Create two orders for client
    const [order1] = await db('order')
      .insert({
        client_id: client.id,
        total_amount: 700,
        status: 'pending',
        pickup_suggestion: '18:00',
      })
      .returning('*');
    await db('order_item').insert({
      order_id: order1.id,
      product_id: product.id,
      quantity: 2,
      unit_price: 350,
    });

    const [order2] = await db('order')
      .insert({
        client_id: client.id,
        total_amount: 350,
        status: 'accepted',
        pickup_suggestion: '19:00',
      })
      .returning('*');
    await db('order_item').insert({
      order_id: order2.id,
      product_id: product.id,
      quantity: 1,
      unit_price: 350,
    });

    // Create an order for another client (should not appear)
    await db('order').insert({
      client_id: otherClient.id,
      total_amount: 500,
      status: 'pending',
    });

    const clientToken = makeToken({ id: client.id, username: client.username, role: client.role });
    return { client, clientToken, order1, order2, product };
  }

  it('should return 401 without authentication', async () => {
    const res = await request(app).get('/api/orders/my');
    expect(res.status).toBe(401);
  });

  it('should return only the authenticated client orders', async () => {
    const { clientToken } = await seedClientOrders();

    const res = await request(app)
      .get('/api/orders/my')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(2);
  });

  it('should include complete order details', async () => {
    const { clientToken, product } = await seedClientOrders();

    const res = await request(app)
      .get('/api/orders/my')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    const order = res.body.orders[0]; // most recent first
    expect(order.total_amount).toBeDefined();
    expect(order.status).toBeDefined();
    expect(order.pickup_suggestion).toBeDefined();
    expect(order.items).toBeDefined();
    expect(order.items.length).toBeGreaterThan(0);
    expect(order.items[0].name).toBe('Empanada de Carne');
    expect(order.items[0].quantity).toBeDefined();
    expect(order.items[0].unit_price).toBeDefined();
  });

  it('should order by created_at DESC (most recent first)', async () => {
    const { clientToken } = await seedClientOrders();

    const res = await request(app)
      .get('/api/orders/my')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    const orders = res.body.orders;
    // The second order should come first (created later)
    expect(orders[0].status).toBe('accepted');
    expect(orders[1].status).toBe('pending');
  });

  it('should return empty array when client has no orders', async () => {
    const db = getTestDb();
    const [newClient] = await db('client')
      .insert({
        username: 'newclient',
        password_hash: '$2b$10$fakehash',
        name: 'New Client',
        whatsapp: '1234567890',
        role: 'client',
      })
      .returning('*');
    const token = makeToken({ id: newClient.id, username: newClient.username, role: newClient.role });

    const res = await request(app)
      .get('/api/orders/my')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(0);
  });
});
