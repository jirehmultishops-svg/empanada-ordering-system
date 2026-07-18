import { Router, Response } from 'express';
import db from '../db/connection.js';
import { authenticate, authorizeAdmin, AuthRequest } from '../middleware/auth.js';
import { validateCategory } from '../validators/categories.js';

const router = Router();

// GET / - List all categories ordered by display_order (public)
router.get('/', async (_req, res: Response) => {
  try {
    const categories = await db('category')
      .select('id', 'name', 'description', 'display_order', 'active', 'created_at')
      .orderBy('display_order', 'asc');

    return res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST / - Create category (admin only)
router.post('/', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response) => {
  const validation = validateCategory(req.body);
  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  const { name, description, display_order } = validation.data;

  try {
    const [category] = await db('category')
      .insert({
        name,
        description: description || null,
        display_order: display_order ?? 0,
      })
      .returning(['id', 'name', 'description', 'display_order', 'active', 'created_at']);

    return res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /:id - Update category (admin only)
router.put('/:id', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const validation = validateCategory(req.body);
  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  const { name, description, display_order } = validation.data;

  try {
    const [updated] = await db('category')
      .where({ id })
      .update({
        name,
        description: description ?? null,
        display_order: display_order ?? 0,
      })
      .returning(['id', 'name', 'description', 'display_order', 'active', 'created_at']);

    if (!updated) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    return res.json(updated);
  } catch (error) {
    console.error('Error updating category:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// DELETE /:id - Delete category (admin only, soft delete)
router.delete('/:id', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const [updated] = await db('category')
      .where({ id })
      .update({ active: false })
      .returning(['id', 'name', 'active']);

    if (!updated) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    return res.json({ message: 'Categoría eliminada', category: updated });
  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
