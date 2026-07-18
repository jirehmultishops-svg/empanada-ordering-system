import fc from 'fast-check';

// --- Primitive generators ---

/** UUID v4 format string */
export const uuidArb = fc.uuid();

/** Positive price: 0.01 to 99999.99, two decimal places */
export const priceArb = fc.integer({ min: 1, max: 9999999 }).map((n) => Number((n / 100).toFixed(2)));

/** Positive integer quantity (1-100) */
export const quantityArb = fc.integer({ min: 1, max: 100 });

// --- Domain generators ---

/** Valid WhatsApp number: 10-15 digits */
export const whatsappArb = fc.integer({ min: 10, max: 15 }).chain((len) =>
  fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
    minLength: len,
    maxLength: len,
  })
);

/** Invalid WhatsApp number: less than 10 or more than 15 digits, or contains non-digits */
export const invalidWhatsappArb = fc.oneof(
  // Too short (1-9 digits)
  fc.integer({ min: 1, max: 9 }).chain((len) =>
    fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
      minLength: len,
      maxLength: len,
    })
  ),
  // Too long (16-25 digits)
  fc.integer({ min: 16, max: 25 }).chain((len) =>
    fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
      minLength: len,
      maxLength: len,
    })
  ),
  // Contains non-digit characters
  fc.string({ minLength: 10, maxLength: 15 }).filter((s) => /[^0-9]/.test(s))
);

/** Valid username: alphanumeric, 3-30 chars */
export const usernameArb = fc.stringOf(
  fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')
  ),
  { minLength: 3, maxLength: 30 }
);

/** Valid client name: 2-100 chars, non-empty after trim */
export const clientNameArb = fc.string({ minLength: 2, maxLength: 100 }).filter((s) => s.trim().length >= 2);

/** Valid password: 6-72 chars (bcrypt limit) */
export const passwordArb = fc.string({ minLength: 6, maxLength: 72 }).filter((s) => s.trim().length >= 6);

/** Valid client registration data */
export const clientRegistrationArb = fc.record({
  name: clientNameArb,
  whatsapp: whatsappArb,
  username: usernameArb,
  password: passwordArb,
});

/** Valid category data */
export const categoryDataArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  description: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
  display_order: fc.integer({ min: 0, max: 100 }),
  active: fc.boolean(),
});

/** Valid product data (without category_id — caller provides it) */
export const productDataArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  description: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
  price: priceArb,
  image_url: fc.option(fc.webUrl(), { nil: undefined }),
  active: fc.boolean(),
});

/** Cart item data (product_id provided by caller) */
export const cartItemArb = fc.record({
  quantity: quantityArb,
});

/** Non-empty list of cart items with product/price info for calculation tests */
export const cartItemsWithPriceArb = fc.array(
  fc.record({
    quantity: quantityArb,
    price: priceArb,
  }),
  { minLength: 1, maxLength: 20 }
);

/** Valid order status */
export const orderStatusArb = fc.constantFrom('pending', 'accepted', 'rejected', 'ready', 'delivered');

/** Valid order status transition source */
export const orderStatusSourceArb = fc.constantFrom('pending', 'accepted', 'rejected', 'ready');

/** Pickup suggestion: a time string like "14:30" or descriptive text */
export const pickupSuggestionArb = fc.oneof(
  fc.tuple(fc.integer({ min: 8, max: 21 }), fc.integer({ min: 0, max: 59 })).map(
    ([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  ),
  fc.constantFrom('por la mañana', 'al mediodía', 'por la tarde', 'a las 5')
);

/** Time slot data */
export const timeSlotArb = fc.record({
  slot_date: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(
    (d) => d.toISOString().split('T')[0]
  ),
  start_time: fc.tuple(fc.integer({ min: 8, max: 20 }), fc.integer({ min: 0, max: 59 })).map(
    ([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  ),
  end_time: fc.tuple(fc.integer({ min: 9, max: 22 }), fc.integer({ min: 0, max: 59 })).map(
    ([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  ),
  active: fc.boolean(),
});

/** Batch data */
export const batchDataArb = fc.record({
  status: fc.constantFrom('pending', 'preparing', 'ready'),
  estimated_minutes: fc.option(fc.integer({ min: 5, max: 120 }), { nil: undefined }),
});

/** OCR result: extracted amount vs order amount */
export const ocrComparisonArb = fc.record({
  extracted_amount: priceArb,
  order_amount: priceArb,
});

/** Client role */
export const roleArb = fc.constantFrom('client', 'admin');
