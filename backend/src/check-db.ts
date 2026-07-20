import db from './db/connection.js';

async function check() {
  try {
    const tables = await db.raw("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    console.log('Tables:', tables.rows.map((r: any) => r.tablename));
    
    const settings = await db('settings').select('*');
    console.log('Settings:', settings);

    const clients = await db('client').select('id', 'username', 'role');
    console.log('Clients:', clients);

    await db.destroy();
  } catch (err) {
    console.error('Error:', err);
    await db.destroy();
  }
}

check();
