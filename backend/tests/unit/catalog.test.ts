import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index.js';
import { setupTestDb, cleanTestDb, teardownTestDb, getTestDb } from '../helpers/setup.js';

describe('GET /api/catalog', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanTestDb();
  });

  it('should return 200 with empty array when no categories exist', async () => {
    const res = await request(app).get('/api/catalog');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should return active categories with their active products', async () => {
    const db = getTestDb();

    const [cat] = await db('category')
      .insert({ name: 'Empanadas', description: 'Caseras', display_order: 1, active: true })
      .returning('*');

    await db('product').insert([
      { name: 'Empanada de Carne', price: 350, category_id: cat.id, active: true },
      { name: 'Empanada de Pollo', price: 300, category_id: cat.id, active: true },
    ]);

    const res = await request(app).get('/api/catalog');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Empanadas');
    expect(res.body[0].products).toHaveLength(2);
    expect(res.body[0].products[0].name).toBe('Empanada de Carne');
    expect(res.body[0].products[1].name).toBe('Empanada de Pollo');
  });

  it('should not include inactive products', async () => {
    const db = getTestDb();

    const [cat] = await db('category')
      .insert({ name: 'Empanadas', display_order: 1, active: true })
      .returning('*');

    await db('product').insert([
      { name: 'Empanada de Carne', price: 350, category_id: cat.id, active: true },
      { name: 'Empanada Descontinuada', price: 200, category_id: cat.id, active: false },
    ]);

    const res = await request(app).get('/api/catalog');

    expect(res.status).toBe(200);
    expect(res.body[0].products).toHaveLength(1);
    expect(res.body[0].products[0].name).toBe('Empanada de Carne');
  });

  it('should not include inactive categories', async () => {
    const db = getTestDb();

    await db('category').insert([
      { name: 'Empanadas', display_order: 1, active: true },
      { name: 'Descatalogada', display_order: 2, active: false },
    ]);

    const res = await request(app).get('/api/catalog');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Empanadas');
  });

  it('should order categories by display_order ASC', async () => {
    const db = getTestDb();

    await db('category').insert([
      { name: 'Postres', display_order: 3, active: true },
      { name: 'Empanadas', display_order: 1, active: true },
      { name: 'Bebidas', display_order: 2, active: true },
    ]);

    const res = await request(app).get('/api/catalog');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].name).toBe('Empanadas');
    expect(res.body[1].name).toBe('Bebidas');
    expect(res.body[2].name).toBe('Postres');
  });

  it('should order products by name ASC within each category', async () => {
    const db = getTestDb();

    const [cat] = await db('category')
      .insert({ name: 'Empanadas', display_order: 1, active: true })
      .returning('*');

    await db('product').insert([
      { name: 'Empanada Caprese', price: 400, category_id: cat.id, active: true },
      { name: 'Empanada Árabe', price: 350, category_id: cat.id, active: true },
      { name: 'Empanada de Carne', price: 350, category_id: cat.id, active: true },
    ]);

    const res = await request(app).get('/api/catalog');

    expect(res.status).toBe(200);
    const names = res.body[0].products.map((p: { name: string }) => p.name);
    expect(names).toEqual(['Empanada Caprese', 'Empanada de Carne', 'Empanada Árabe']);
  });

  it('should include correct product fields in response', async () => {
    const db = getTestDb();

    const [cat] = await db('category')
      .insert({ name: 'Empanadas', display_order: 1, active: true })
      .returning('*');

    await db('product').insert({
      name: 'Empanada de Carne',
      description: 'Carne cortada a cuchillo',
      price: 350,
      image_url: '/uploads/carne.jpg',
      category_id: cat.id,
      active: true,
    });

    const res = await request(app).get('/api/catalog');

    expect(res.status).toBe(200);
    const product = res.body[0].products[0];
    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('name', 'Empanada de Carne');
    expect(product).toHaveProperty('description', 'Carne cortada a cuchillo');
    expect(product).toHaveProperty('price');
    expect(product).toHaveProperty('image_url', '/uploads/carne.jpg');
    // Should not expose active field or category_id to public catalog
    expect(product).not.toHaveProperty('active');
    expect(product).not.toHaveProperty('category_id');
  });

  it('should include correct category fields in response', async () => {
    const db = getTestDb();

    await db('category').insert({
      name: 'Empanadas',
      description: 'Caseras y riquísimas',
      display_order: 1,
      active: true,
    });

    const res = await request(app).get('/api/catalog');

    expect(res.status).toBe(200);
    const category = res.body[0];
    expect(category).toHaveProperty('id');
    expect(category).toHaveProperty('name', 'Empanadas');
    expect(category).toHaveProperty('description', 'Caseras y riquísimas');
    expect(category).toHaveProperty('display_order', 1);
    expect(category).toHaveProperty('products');
  });

  it('should be accessible without authentication', async () => {
    const res = await request(app).get('/api/catalog');

    // No auth header - should still succeed
    expect(res.status).toBe(200);
  });
});
