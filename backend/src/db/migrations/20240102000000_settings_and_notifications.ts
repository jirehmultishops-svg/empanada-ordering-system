import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Settings table (key-value pairs)
  await knex.schema.createTable('settings', (table) => {
    table.string('key').primary();
    table.string('value').notNullable();
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Insert default delivery mode
  await knex('settings').insert({ key: 'delivery_mode', value: 'slots' });

  // Notifications table
  await knex.schema.createTable('notification', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('client_id').notNullable().references('id').inTable('client').onDelete('CASCADE');
    table.string('type').notNullable();
    table.string('message').notNullable();
    table.jsonb('data');
    table.boolean('read').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.index('client_id');
    table.index('read');
    table.index(['client_id', 'read']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification');
  await knex.schema.dropTableIfExists('settings');
}
