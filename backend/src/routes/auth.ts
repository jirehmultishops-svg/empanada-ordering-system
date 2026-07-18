import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db/connection.js';
import { validateRegister, validateLogin } from '../validators/auth.js';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  // 1. Validate input
  const validation = validateRegister(req.body);
  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  const { name, whatsapp, username, password } = validation.data;

  try {
    // 2. Check username uniqueness
    const existingClient = await db('client').where({ username }).first();
    if (existingClient) {
      return res.status(409).json({
        errors: [{ field: 'username', message: 'Ese nombre de usuario ya está en uso' }],
      });
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Insert client and create cart in a transaction
    const result = await db.transaction(async (trx) => {
      const [client] = await trx('client')
        .insert({
          username,
          password_hash: passwordHash,
          name,
          whatsapp,
          role: 'client',
        })
        .returning(['id', 'name', 'username', 'whatsapp']);

      // 5. Create empty cart
      await trx('cart').insert({ client_id: client.id });

      return client;
    });

    // 6. Generate JWT
    const token = jwt.sign(
      { id: result.id, username: result.username, role: 'client' },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 7. Return response
    return res.status(201).json({
      token,
      client: {
        id: result.id,
        name: result.name,
        username: result.username,
        whatsapp: result.whatsapp,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  // 1. Validate input
  const validation = validateLogin(req.body);
  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  const { username, password } = validation.data;

  try {
    // 2. Find client by username
    const client = await db('client').where({ username }).first();
    if (!client) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    // 3. Compare password
    const passwordMatch = await bcrypt.compare(password, client.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    // 4. Generate JWT
    const token = jwt.sign(
      { id: client.id, username: client.username, role: client.role },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 5. Return response
    return res.status(200).json({
      token,
      client: {
        id: client.id,
        name: client.name,
        username: client.username,
        whatsapp: client.whatsapp,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
