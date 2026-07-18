import { Router, Response } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizeAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

const MAX_SLOTS_PER_DAY = 4;

// GET / - List time slots, optionally filtered by date
router.get('/', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response) => {
  const { date } = req.query;

  try {
    let query = db('time_slot').orderBy('slot_date', 'asc').orderBy('start_time', 'asc');

    if (date && typeof date === 'string') {
      query = query.where('slot_date', date);
    }

    const slots = await query;

    return res.json({
      time_slots: slots.map((slot) => ({
        id: slot.id,
        slot_date: slot.slot_date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        active: slot.active,
      })),
    });
  } catch (error) {
    console.error('Error listing time slots:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST / - Create a time slot (validate max 4 per day)
router.post('/', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response) => {
  const { slot_date, start_time, end_time } = req.body;

  if (!slot_date || !start_time || !end_time) {
    return res.status(400).json({ message: 'Los campos slot_date, start_time y end_time son requeridos' });
  }

  try {
    // Count existing slots for the given date
    const existingCount = await db('time_slot')
      .where('slot_date', slot_date)
      .count('id as count')
      .first();

    const count = parseInt(existingCount?.count as string, 10) || 0;

    if (count >= MAX_SLOTS_PER_DAY) {
      return res.status(400).json({ message: 'Máximo 4 franjas por día' });
    }

    const [slot] = await db('time_slot')
      .insert({
        slot_date,
        start_time,
        end_time,
        active: true,
      })
      .returning('*');

    return res.status(201).json({
      id: slot.id,
      slot_date: slot.slot_date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      active: slot.active,
    });
  } catch (error) {
    console.error('Error creating time slot:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /:id - Update a time slot
router.put('/:id', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { slot_date, start_time, end_time, active } = req.body;

  try {
    const slot = await db('time_slot').where({ id }).first();
    if (!slot) {
      return res.status(404).json({ message: 'Franja horaria no encontrada' });
    }

    const updateData: Record<string, unknown> = {};
    if (slot_date !== undefined) updateData.slot_date = slot_date;
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (active !== undefined) updateData.active = active;

    // If changing date, validate max 4 on target date
    if (slot_date && slot_date !== slot.slot_date) {
      const existingCount = await db('time_slot')
        .where('slot_date', slot_date)
        .count('id as count')
        .first();

      const count = parseInt(existingCount?.count as string, 10) || 0;
      if (count >= MAX_SLOTS_PER_DAY) {
        return res.status(400).json({ message: 'Máximo 4 franjas por día' });
      }
    }

    const [updated] = await db('time_slot')
      .where({ id })
      .update(updateData)
      .returning('*');

    return res.json({
      id: updated.id,
      slot_date: updated.slot_date,
      start_time: updated.start_time,
      end_time: updated.end_time,
      active: updated.active,
    });
  } catch (error) {
    console.error('Error updating time slot:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// DELETE /:id - Delete a time slot
router.delete('/:id', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const slot = await db('time_slot').where({ id }).first();
    if (!slot) {
      return res.status(404).json({ message: 'Franja horaria no encontrada' });
    }

    await db('time_slot').where({ id }).delete();

    return res.json({ message: 'Franja horaria eliminada' });
  } catch (error) {
    console.error('Error deleting time slot:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
