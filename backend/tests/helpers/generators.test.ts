import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  whatsappArb,
  invalidWhatsappArb,
  usernameArb,
  clientRegistrationArb,
  categoryDataArb,
  productDataArb,
  priceArb,
  quantityArb,
  cartItemsWithPriceArb,
  timeSlotArb,
  ocrComparisonArb,
  roleArb,
} from './generators.js';

describe('Test Generators', () => {
  it('whatsappArb generates strings with 10-15 digits', () => {
    fc.assert(
      fc.property(whatsappArb, (whatsapp) => {
        expect(whatsapp).toMatch(/^\d{10,15}$/);
      }),
      { numRuns: 50 }
    );
  });

  it('invalidWhatsappArb generates invalid WhatsApp numbers', () => {
    fc.assert(
      fc.property(invalidWhatsappArb, (whatsapp) => {
        const isValidDigitLength = /^\d{10,15}$/.test(whatsapp);
        expect(isValidDigitLength).toBe(false);
      }),
      { numRuns: 50 }
    );
  });

  it('usernameArb generates alphanumeric strings 3-30 chars', () => {
    fc.assert(
      fc.property(usernameArb, (username) => {
        expect(username.length).toBeGreaterThanOrEqual(3);
        expect(username.length).toBeLessThanOrEqual(30);
        expect(username).toMatch(/^[a-z0-9]+$/);
      }),
      { numRuns: 50 }
    );
  });

  it('clientRegistrationArb produces valid registration objects', () => {
    fc.assert(
      fc.property(clientRegistrationArb, (reg) => {
        expect(reg).toHaveProperty('name');
        expect(reg).toHaveProperty('whatsapp');
        expect(reg).toHaveProperty('username');
        expect(reg).toHaveProperty('password');
        expect(reg.whatsapp).toMatch(/^\d{10,15}$/);
        expect(reg.username.length).toBeGreaterThanOrEqual(3);
        expect(reg.password.length).toBeGreaterThanOrEqual(6);
      }),
      { numRuns: 50 }
    );
  });

  it('priceArb generates positive decimals', () => {
    fc.assert(
      fc.property(priceArb, (price) => {
        expect(price).toBeGreaterThan(0);
        expect(price).toBeLessThanOrEqual(99999.99);
      }),
      { numRuns: 50 }
    );
  });

  it('categoryDataArb generates valid category data', () => {
    fc.assert(
      fc.property(categoryDataArb, (cat) => {
        expect(cat.name.trim().length).toBeGreaterThan(0);
        expect(typeof cat.display_order).toBe('number');
        expect(typeof cat.active).toBe('boolean');
      }),
      { numRuns: 50 }
    );
  });

  it('productDataArb generates valid product data', () => {
    fc.assert(
      fc.property(productDataArb, (product) => {
        expect(product.name.trim().length).toBeGreaterThan(0);
        expect(product.price).toBeGreaterThan(0);
        expect(typeof product.active).toBe('boolean');
      }),
      { numRuns: 50 }
    );
  });

  it('cartItemsWithPriceArb generates non-empty arrays', () => {
    fc.assert(
      fc.property(cartItemsWithPriceArb, (items) => {
        expect(items.length).toBeGreaterThan(0);
        items.forEach((item) => {
          expect(item.quantity).toBeGreaterThan(0);
          expect(item.price).toBeGreaterThan(0);
        });
      }),
      { numRuns: 50 }
    );
  });

  it('roleArb generates valid roles', () => {
    fc.assert(
      fc.property(roleArb, (role) => {
        expect(['client', 'admin']).toContain(role);
      }),
      { numRuns: 20 }
    );
  });
});
