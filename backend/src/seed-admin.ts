import db from './db/connection.js';
import bcrypt from 'bcrypt';

async function seedAdmin() {
  const existing = await db('client').where({ username: 'admin' }).first();
  if (existing) {
    console.log('Admin user already exists.');
    await db.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash('admin123456', 10);

  await db('client').insert({
    username: 'admin',
    password_hash: passwordHash,
    name: 'Jireh Admin',
    whatsapp: '1234567890',
    role: 'admin',
  });

  console.log('Admin user created successfully!');
  console.log('Username: admin');
  console.log('Password: admin123456');
  await db.destroy();
}

seedAdmin().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
