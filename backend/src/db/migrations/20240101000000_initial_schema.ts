import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable uuid-ossp extension for UUID generation
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Category
  await knex.schema.createTable('category', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name').notNullable();
    table.string('description');
    table.integer('display_order').notNullable().defaultTo(0);
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // Product
  await knex.schema.createTable('product', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('category_id').notNullable().references('id').inTable('category').onDelete('RESTRICT');
    table.string('name').notNullable();
    table.string('description');
    table.decimal('price', 10, 2).notNullable();
    table.string('image_url');
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('category_id');
    table.index('active');
  });

  // Client
  await knex.schema.createTable('client', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('username').notNullable().unique();
    table.string('password_hash').notNullable();
    table.string('name').notNullable();
    table.string('whatsapp').notNullable();
    table.string('role').notNullable().defaultTo('client');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('username');
  });

  // Cart
  await knex.schema.createTable('cart', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('client_id').notNullable().unique().references('id').inTable('client').onDelete('CASCADE');
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('client_id');
  });

  // CartItem
  await knex.schema.createTable('cart_item', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('cart_id').notNullable().references('id').inTable('cart').onDelete('CASCADE');
    table.uuid('product_id').notNullable().references('id').inTable('product').onDelete('CASCADE');
    table.integer('quantity').notNullable().defaultTo(1);
    table.timestamp('added_at').notNullable().defaultTo(knex.fn.now());

    table.index('cart_id');
    table.index('product_id');
    table.unique(['cart_id', 'product_id']);
  });

  // TimeSlot
  await knex.schema.createTable('time_slot', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.date('slot_date').notNullable();
    table.time('start_time').notNullable();
    table.time('end_time').notNullable();
    table.boolean('active').notNullable().defaultTo(true);

    table.index('slot_date');
  });

  // Batch
  await knex.schema.createTable('batch', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('status').notNullable().defaultTo('pending');
    table.integer('estimated_minutes');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('ready_at');

    table.index('status');
  });

  // Order
  await knex.schema.createTable('order', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('client_id').notNullable().references('id').inTable('client').onDelete('RESTRICT');
    table.decimal('total_amount', 10, 2).notNullable();
    table.string('status').notNullable().defaultTo('pending');
    table.string('pickup_suggestion');
    table.uuid('time_slot_id').references('id').inTable('time_slot').onDelete('SET NULL');
    table.uuid('batch_id').references('id').inTable('batch').onDelete('SET NULL');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index('client_id');
    table.index('status');
    table.index('time_slot_id');
    table.index('batch_id');
  });

  // OrderItem
  await knex.schema.createTable('order_item', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('order_id').notNullable().references('id').inTable('order').onDelete('CASCADE');
    table.uuid('product_id').notNullable().references('id').inTable('product').onDelete('RESTRICT');
    table.integer('quantity').notNullable();
    table.decimal('unit_price', 10, 2).notNullable();

    table.index('order_id');
    table.index('product_id');
  });

  // Receipt
  await knex.schema.createTable('receipt', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('order_id').notNullable().references('id').inTable('order').onDelete('CASCADE');
    table.string('image_url').notNullable();
    table.decimal('extracted_amount', 10, 2);
    table.string('ocr_status').notNullable().defaultTo('processing');
    table.boolean('verified').notNullable().defaultTo(false);
    table.timestamp('uploaded_at').notNullable().defaultTo(knex.fn.now());

    table.index('order_id');
    table.index('ocr_status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('receipt');
  await knex.schema.dropTableIfExists('order_item');
  await knex.schema.dropTableIfExists('order');
  await knex.schema.dropTableIfExists('batch');
  await knex.schema.dropTableIfExists('time_slot');
  await knex.schema.dropTableIfExists('cart_item');
  await knex.schema.dropTableIfExists('cart');
  await knex.schema.dropTableIfExists('client');
  await knex.schema.dropTableIfExists('product');
  await knex.schema.dropTableIfExists('category');
  await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
}
