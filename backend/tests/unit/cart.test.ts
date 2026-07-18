import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/index.js';
import { setupTestDb, cleanTestDb, teardownTestDb, getTestDb } from '../helpers/setup.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function makeToken(payload: { id: string; username: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET);
}

describe('Cart API - /api/cart', () => {
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

  describe('GET /api/cart', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/cart');
      expect(res.status).toBe(401);
    });

    it('should return empty cart for new client', async () => {
      const { token, cart } = await createClientWithCart();

      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(cart.id);
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('should return cart with items and computed totals', async () => {
      const { token, cart } = await createClientWithCart();
      const category = await createCategory();
      const product = await createProduct(category.id, { name: 'Empanada de Carne', price: 350 });

      const db = getTestDb();
      await db('cart_item').insert({ cart_id: cart.id, product_id: product.id, quantity: 3 });

      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].product_id).toBe(product.id);
      expect(res.body.items[0].name).toBe('Empanada de Carne');
      expect(res.body.items[0].price).toBe(350);
      expect(res.body.items[0].quantity).toBe(3);
      expect(res.body.items[0].subtotal).toBe(1050);
      expect(res.body.total).toBe(1050);
    });
  });

  describe('POST /api/cart/items', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).post('/api/cart/items').send({ product_id: 'some-id' });
      expect(res.status).toBe(401);
    });

    it('should return 400 when product_id is missing', async () => {
      const { token } = await createClientWithCart();

      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('product_id es requerido');
    });

    it('should return 404 for non-existent product', async () => {
      const { token } = await createClientWithCart();

      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Producto no encontrado o no está disponible');
    });

    it('should return 404 for inactive product', async () => {
      const { token } = await createClientWithCart();
      const category = await createCategory();
      const product = await createProduct(category.id, { active: false });

      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: product.id });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Producto no encontrado o no está disponible');
    });

    it('should add new product to cart with quantity 1', async () => {
      const { token } = await createClientWithCart();
      const category = await createCategory();
      const product = await createProduct(category.id);

      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: product.id });

      expect(res.status).toBe(201);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].product_id).toBe(product.id);
      expect(res.body.items[0].quantity).toBe(1);
      expect(res.body.items[0].subtotal).toBe(350);
      expect(res.body.total).toBe(350);
    });

    it('should increment quantity when product already in cart', async () => {
      const { token } = await createClientWithCart();
      const category = await createCategory();
      const product = await createProduct(category.id);

      // Add first time
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: product.id });

      // Add second time - should increment
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ product_id: product.id });

      expect(res.status).toBe(201);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].quantity).toBe(2);
      expect(res.body.items[0].subtotal).toBe(700);
      expect(res.body.total).toBe(700);
    });
  });

  describe('PUT /api/cart/items/:id', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).put('/api/cart/items/some-id').send({ quantity: 2 });
      expect(res.status).toBe(401);
    });

    it('should return 400 when quantity is missing', async () => {
      const { token } = await createClientWithCart();

      const res = await request(app)
        .put('/api/cart/items/some-id')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('quantity es requerido');
    });

    it('should return 400 when quantity is less than 1', async () => {
      const { token } = await createClientWithCart();

      const res = await request(app)
        .put('/api/cart/items/some-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 0 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('quantity debe ser un número entero mayor o igual a 1');
    });

    it('should return 400 when quantity is not an integer', async () => {
      const { token } = await createClientWithCart();

      const res = await request(app)
        .put('/api/cart/items/some-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 2.5 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('quantity debe ser un número entero mayor o igual a 1');
    });

    it('should return 404 when item does not belong to client cart', async () => {
      const { token } = await createClientWithCart();

      const res = await request(app)
        .put('/api/cart/items/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 5 });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Item no encontrado en el carrito');
    });

    it('should update quantity and recalculate totals', async () => {
      const { token, cart } = await createClientWithCart();
      const category = await createCategory();
      const product = await createProduct(category.id, { price: 400 });

      const db = getTestDb();
      const [item] = await db('cart_item')
        .insert({ cart_id: cart.id, product_id: product.id, quantity: 1 })
        .returning('*');

      const res = await request(app)
        .put(`/api/cart/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 5 });

      expect(res.status).toBe(200);
      expect(res.body.items[0].quantity).toBe(5);
      expect(res.body.items[0].subtotal).toBe(2000);
      expect(res.body.total).toBe(2000);
    });

    it('should not allow modifying items from another client cart', async () => {
      const db = getTestDb();

      // Create first client with cart
      const { token } = await createClientWithCart();

      // Create second client with cart and an item
      const [client2] = await db('client')
        .insert({
          username: 'otherclient',
          password_hash: '$2b$10$fakehashfortesting',
          name: 'Other Client',
          whatsapp: '9876543210',
          role: 'client',
        })
        .returning('*');

      const [cart2] = await db('cart').insert({ client_id: client2.id }).returning('*');
      const category = await createCategory();
      const product = await createProduct(category.id);

      const [item] = await db('cart_item')
        .insert({ cart_id: cart2.id, product_id: product.id, quantity: 1 })
        .returning('*');

      // First client tries to modify second client's item
      const res = await request(app)
        .put(`/api/cart/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 10 });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Item no encontrado en el carrito');
    });
  });

  describe('DELETE /api/cart/items/:id', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).delete('/api/cart/items/some-id');
      expect(res.status).toBe(401);
    });

    it('should return 404 when item does not exist', async () => {
      const { token } = await createClientWithCart();

      const res = await request(app)
        .delete('/api/cart/items/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Item no encontrado en el carrito');
    });

    it('should remove item and recalculate total', async () => {
      const { token, cart } = await createClientWithCart();
      const category = await createCategory();
      const product1 = await createProduct(category.id, { name: 'Empanada A', price: 300 });
      const product2 = await createProduct(category.id, { name: 'Empanada B', price: 400 });

      const db = getTestDb();
      const [item1] = await db('cart_item')
        .insert({ cart_id: cart.id, product_id: product1.id, quantity: 2 })
        .returning('*');
      await db('cart_item')
        .insert({ cart_id: cart.id, product_id: product2.id, quantity: 1 });

      const res = await request(app)
        .delete(`/api/cart/items/${item1.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].name).toBe('Empanada B');
      expect(res.body.total).toBe(400);
    });

    it('should not allow deleting items from another client cart', async () => {
      const db = getTestDb();

      const { token } = await createClientWithCart();

      // Create second client with item
      const [client2] = await db('client')
        .insert({
          username: 'otherclient2',
          password_hash: '$2b$10$fakehashfortesting',
          name: 'Other Client 2',
          whatsapp: '9876543211',
          role: 'client',
        })
        .returning('*');

      const [cart2] = await db('cart').insert({ client_id: client2.id }).returning('*');
      const category = await createCategory();
      const product = await createProduct(category.id);

      const [item] = await db('cart_item')
        .insert({ cart_id: cart2.id, product_id: product.id, quantity: 1 })
        .returning('*');

      const res = await request(app)
        .delete(`/api/cart/items/${item.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Item no encontrado en el carrito');
    });
  });
});
