import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

// GET / - Public catalog: active products grouped by active categories
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await db('category')
      .select('id', 'name', 'description', 'display_order')
      .where({ active: true })
      .orderBy('display_order', 'asc');

    const products = await db('product')
      .select('id', 'category_id', 'name', 'description', 'price', 'image_url')
      .where({ active: true })
      .orderBy('name', 'asc');

    const catalog = categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      display_order: category.display_order,
      products: products
        .filter((p) => p.category_id === category.id)
        .map(({ category_id: _cid, ...rest }) => rest),
    }));

    return res.json(catalog);
  } catch (error) {
    console.error('Error fetching catalog:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
