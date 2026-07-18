import { describe, it, expect } from 'vitest';
import { validateProduct } from '../../src/validators/products.js';

describe('validateProduct', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  it('should accept valid product with all fields', () => {
    const result = validateProduct({
      name: 'Empanada de Carne',
      price: 350.50,
      category_id: validUUID,
      description: 'Empanada casera de carne cortada a cuchillo',
      image_url: '/uploads/empanada.jpg',
      active: true,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.name).toBe('Empanada de Carne');
      expect(result.data.price).toBe(350.50);
      expect(result.data.category_id).toBe(validUUID);
      expect(result.data.description).toBe('Empanada casera de carne cortada a cuchillo');
      expect(result.data.image_url).toBe('/uploads/empanada.jpg');
      expect(result.data.active).toBe(true);
    }
  });

  it('should accept valid product with only required fields', () => {
    const result = validateProduct({
      name: 'Empanada de Pollo',
      price: 300,
      category_id: validUUID,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.name).toBe('Empanada de Pollo');
      expect(result.data.price).toBe(300);
      expect(result.data.category_id).toBe(validUUID);
      expect(result.data.description).toBeUndefined();
      expect(result.data.image_url).toBeUndefined();
      expect(result.data.active).toBeUndefined();
    }
  });

  describe('name validation', () => {
    it('should reject empty name', () => {
      const result = validateProduct({ name: '', price: 100, category_id: validUUID });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.field === 'name')).toBe(true);
      }
    });

    it('should reject missing name', () => {
      const result = validateProduct({ price: 100, category_id: validUUID });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.field === 'name')).toBe(true);
      }
    });

    it('should reject whitespace-only name', () => {
      const result = validateProduct({ name: '   ', price: 100, category_id: validUUID });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.field === 'name')).toBe(true);
      }
    });

    it('should trim the name', () => {
      const result = validateProduct({ name: '  Empanada  ', price: 100, category_id: validUUID });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.name).toBe('Empanada');
      }
    });
  });

  describe('price validation', () => {
    it('should reject missing price', () => {
      const result = validateProduct({ name: 'Test', category_id: validUUID });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.field === 'price')).toBe(true);
      }
    });

    it('should reject zero price', () => {
      const result = validateProduct({ name: 'Test', price: 0, category_id: validUUID });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.field === 'price')).toBe(true);
      }
    });

    it('should reject negative price', () => {
      const result = validateProduct({ name: 'Test', price: -100, category_id: validUUID });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.field === 'price')).toBe(true);
      }
    });

    it('should reject non-numeric price', () => {
      const result = validateProduct({ name: 'Test', price: 'abc', category_id: validUUID });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.field === 'price')).toBe(true);
      }
    });

    it('should accept decimal price', () => {
      const result = validateProduct({ name: 'Test', price: 99.99, category_id: validUUID });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.price).toBe(99.99);
      }
    });

    it('should accept price as string number', () => {
      const result = validateProduct({ name: 'Test', price: '250', category_id: validUUID });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.price).toBe(250);
      }
    });
  });

  describe('category_id validation', () => {
    it('should reject missing category_id', () => {
      const result = validateProduct({ name: 'Test', price: 100 });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.field === 'category_id')).toBe(true);
      }
    });

    it('should reject non-uuid category_id', () => {
      const result = validateProduct({ name: 'Test', price: 100, category_id: 'not-a-uuid' });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.field === 'category_id')).toBe(true);
      }
    });

    it('should reject non-string category_id', () => {
      const result = validateProduct({ name: 'Test', price: 100, category_id: 123 });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.field === 'category_id')).toBe(true);
      }
    });

    it('should accept valid uuid category_id', () => {
      const result = validateProduct({ name: 'Test', price: 100, category_id: validUUID });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.category_id).toBe(validUUID);
      }
    });
  });

  describe('optional fields validation', () => {
    it('should reject non-string description', () => {
      const result = validateProduct({ name: 'Test', price: 100, category_id: validUUID, description: 123 });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.field === 'description')).toBe(true);
      }
    });

    it('should reject non-string image_url', () => {
      const result = validateProduct({ name: 'Test', price: 100, category_id: validUUID, image_url: 456 });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.field === 'image_url')).toBe(true);
      }
    });

    it('should reject non-boolean active', () => {
      const result = validateProduct({ name: 'Test', price: 100, category_id: validUUID, active: 'yes' });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.some(e => e.field === 'active')).toBe(true);
      }
    });

    it('should accept active as false', () => {
      const result = validateProduct({ name: 'Test', price: 100, category_id: validUUID, active: false });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.active).toBe(false);
      }
    });
  });

  it('should report multiple errors at once', () => {
    const result = validateProduct({ description: 123, image_url: 456 });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
      const fields = result.errors.map(e => e.field);
      expect(fields).toContain('name');
      expect(fields).toContain('price');
      expect(fields).toContain('category_id');
    }
  });
});
