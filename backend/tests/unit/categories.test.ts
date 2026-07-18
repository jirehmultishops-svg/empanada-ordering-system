import { describe, it, expect } from 'vitest';
import { validateCategory } from '../../src/validators/categories.js';

describe('validateCategory', () => {
  it('should accept valid category with all fields', () => {
    const result = validateCategory({
      name: 'Empanadas',
      description: 'Deliciosas empanadas caseras',
      display_order: 1,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.name).toBe('Empanadas');
      expect(result.data.description).toBe('Deliciosas empanadas caseras');
      expect(result.data.display_order).toBe(1);
    }
  });

  it('should accept valid category with only name', () => {
    const result = validateCategory({ name: 'Bebidas' });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.name).toBe('Bebidas');
      expect(result.data.description).toBeUndefined();
      expect(result.data.display_order).toBeUndefined();
    }
  });

  it('should reject empty name', () => {
    const result = validateCategory({ name: '' });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('name');
    }
  });

  it('should reject missing name', () => {
    const result = validateCategory({ description: 'Sin nombre' });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0].field).toBe('name');
    }
  });

  it('should reject whitespace-only name', () => {
    const result = validateCategory({ name: '   ' });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0].field).toBe('name');
    }
  });

  it('should reject non-integer display_order', () => {
    const result = validateCategory({ name: 'Test', display_order: 1.5 });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0].field).toBe('display_order');
    }
  });

  it('should reject non-numeric display_order', () => {
    const result = validateCategory({ name: 'Test', display_order: 'abc' });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0].field).toBe('display_order');
    }
  });

  it('should accept display_order of 0', () => {
    const result = validateCategory({ name: 'Test', display_order: 0 });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.display_order).toBe(0);
    }
  });

  it('should accept negative display_order', () => {
    const result = validateCategory({ name: 'Test', display_order: -1 });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.display_order).toBe(-1);
    }
  });

  it('should trim the name', () => {
    const result = validateCategory({ name: '  Empanadas  ' });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.name).toBe('Empanadas');
    }
  });

  it('should reject non-string description', () => {
    const result = validateCategory({ name: 'Test', description: 123 });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0].field).toBe('description');
    }
  });
});
