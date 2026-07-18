import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/index.js';
import { setupTestDb, cleanTestDb, teardownTestDb, getTestDb } from '../helpers/setup.js';
import { parseTimeToMinutes } from '../../src/routes/orders.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function makeToken(payload: { id: string; username: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET);
}

describe('parseTimeToMinutes - Unit Tests', () => {
  it('should parse 00:00 to 0', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
  });

  it('should parse 12:30 to 750', () => {
    expect(parseTimeToMinutes('12:30')).toBe(750);
  });

  it('should parse 23:59 to 1439', () => {
    expect(parseTimeToMinutes('23:59')).toBe(1439);
  });

  it('should parse HH:MM:SS format (ignoring seconds)', () => {
    expect(parseTimeToMinutes('14:30:00')).toBe(870);
  });

  it('should return null for invalid formats', () => {
    expect(parseTimeToMinutes('')).toBeNull();
    expect(parseTimeToMinutes('abc')).toBeNull();
    expect(parseTimeToMinutes('25:00')).toBeNull();
    expect(parseTimeToMinutes('12:60')).toBeNull();
  });

  it('should handle single-digit hour', () => {
    expect(parseTimeToMinutes('9:15')).toBe(555);
  });
});

describe('Time Slots API - /api/admin/time-slots', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanTestDb();
  });

  async function createAdmin() {
    const db = getTestDb();
    const [admin] = await db('client')
      .insert({
        username: 'admin',
        password_hash: '$2b$10$fakehash',
        name: 'Admin User',
        whatsapp: '1234567890',
        role: 'admin',
      })
      .returning('*');
    return { admin, token: makeToken({ id: admin.id, username: admin.username, role: 'admin' }) };
  }

  async function createClient() {
    const db = getTestDb();
    const [client] = await db('client')
      .insert({
        username: 'client1',
        password_hash: '$2b$10$fakehash',
        name: 'Client User',
        whatsapp: '1234567890',
        role: 'client',
      })
      .returning('*');
    return { client, token: makeToken({ id: client.id, username: client.username, role: 'client' }) };
  }

  it('should return 401 without authentication', async () => {
    const res = await request(app).get('/api/admin/time-slots');
    expect(res.status).toBe(401);
  });

  it('should return 403 for non-admin users', async () => {
    const { token } = await createClient();
    const res = await request(app)
      .get('/api/admin/time-slots')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('should create a time slot', async () => {
    const { token } = await createAdmin();
    const res = await request(app)
      .post('/api/admin/time-slots')
      .set('Authorization', `Bearer ${token}`)
      .send({ slot_date: '2024-06-15', start_time: '10:00', end_time: '11:00' });

    expect(res.status).toBe(201);
    expect(res.body.slot_date).toContain('2024-06-15');
    expect(res.body.start_time).toBe('10:00:00');
    expect(res.body.end_time).toBe('11:00:00');
    expect(res.body.active).toBe(true);
  });

  it('should return 400 when required fields are missing', async () => {
    const { token } = await createAdmin();
    const res = await request(app)
      .post('/api/admin/time-slots')
      .set('Authorization', `Bearer ${token}`)
      .send({ slot_date: '2024-06-15' });

    expect(res.status).toBe(400);
  });

  it('should enforce maximum 4 slots per day', async () => {
    const { token } = await createAdmin();
    const date = '2024-06-15';

    // Create 4 slots
    for (let i = 0; i < 4; i++) {
      const res = await request(app)
        .post('/api/admin/time-slots')
        .set('Authorization', `Bearer ${token}`)
        .send({ slot_date: date, start_time: `${10 + i}:00`, end_time: `${11 + i}:00` });
      expect(res.status).toBe(201);
    }

    // 5th slot should fail
    const res = await request(app)
      .post('/api/admin/time-slots')
      .set('Authorization', `Bearer ${token}`)
      .send({ slot_date: date, start_time: '14:00', end_time: '15:00' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Máximo 4 franjas por día');
  });

  it('should list time slots', async () => {
    const { token } = await createAdmin();
    const db = getTestDb();

    await db('time_slot').insert([
      { slot_date: '2024-06-15', start_time: '10:00', end_time: '11:00', active: true },
      { slot_date: '2024-06-15', start_time: '12:00', end_time: '13:00', active: true },
    ]);

    const res = await request(app)
      .get('/api/admin/time-slots')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.time_slots).toHaveLength(2);
  });

  it('should filter time slots by date', async () => {
    const { token } = await createAdmin();
    const db = getTestDb();

    await db('time_slot').insert([
      { slot_date: '2024-06-15', start_time: '10:00', end_time: '11:00', active: true },
      { slot_date: '2024-06-16', start_time: '12:00', end_time: '13:00', active: true },
    ]);

    const res = await request(app)
      .get('/api/admin/time-slots?date=2024-06-15')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.time_slots).toHaveLength(1);
    expect(res.body.time_slots[0].slot_date).toContain('2024-06-15');
  });

  it('should update a time slot', async () => {
    const { token } = await createAdmin();
    const db = getTestDb();

    const [slot] = await db('time_slot')
      .insert({ slot_date: '2024-06-15', start_time: '10:00', end_time: '11:00', active: true })
      .returning('*');

    const res = await request(app)
      .put(`/api/admin/time-slots/${slot.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ start_time: '11:00', end_time: '12:00' });

    expect(res.status).toBe(200);
    expect(res.body.start_time).toBe('11:00:00');
    expect(res.body.end_time).toBe('12:00:00');
  });

  it('should delete a time slot', async () => {
    const { token } = await createAdmin();
    const db = getTestDb();

    const [slot] = await db('time_slot')
      .insert({ slot_date: '2024-06-15', start_time: '10:00', end_time: '11:00', active: true })
      .returning('*');

    const res = await request(app)
      .delete(`/api/admin/time-slots/${slot.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Franja horaria eliminada');

    // Verify it's gone
    const remaining = await db('time_slot').where({ id: slot.id });
    expect(remaining).toHaveLength(0);
  });

  it('should return 404 when updating non-existent slot', async () => {
    const { token } = await createAdmin();
    const res = await request(app)
      .put('/api/admin/time-slots/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ start_time: '11:00' });

    expect(res.status).toBe(404);
  });

  it('should return 404 when deleting non-existent slot', async () => {
    const { token } = await createAdmin();
    const res = await request(app)
      .delete('/api/admin/time-slots/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
