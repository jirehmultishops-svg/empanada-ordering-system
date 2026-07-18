import { Router, Response } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizeAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

const VALID_DELIVERY_MODES = ['slots', 'batches'];

// GET /delivery-mode - Get current delivery mode
router.get('/delivery-mode', authenticate, authorizeAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const setting = await db('settings').where({ key: 'delivery_mode' }).first();
    const mode = setting?.value || 'slots';

    return res.json({ mode });
  } catch (error) {
    console.error('Error getting delivery mode:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /delivery-mode - Set delivery mode
router.put('/delivery-mode', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response) => {
  const { mode } = req.body;

  if (!mode || !VALID_DELIVERY_MODES.includes(mode)) {
    return res.status(400).json({
      message: `Modo inválido. Valores permitidos: ${VALID_DELIVERY_MODES.join(', ')}`,
    });
  }

  try {
    // Upsert: update if exists, insert if not
    const existing = await db('settings').where({ key: 'delivery_mode' }).first();

    if (existing) {
      await db('settings')
        .where({ key: 'delivery_mode' })
        .update({ value: mode, updated_at: db.fn.now() });
    } else {
      await db('settings').insert({ key: 'delivery_mode', value: mode });
    }

    return res.json({ mode });
  } catch (error) {
    console.error('Error setting delivery mode:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
