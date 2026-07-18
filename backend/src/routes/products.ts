import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import db from '../db/connection.js';
import { authenticate, authorizeAdmin, AuthRequest } from '../middleware/auth.js';
import { validateProduct } from '../validators/products.js';

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({ storage });

const router = Router();

// GET / - List all products (public)
router.get('/', async (_req, res: Response) => {
  try {
    const products = await db('product')
      .select('id', 'category_id', 'name', 'description', 'price', 'image_url', 'active', 'created_at', 'updated_at')
      .orderBy('name', 'asc');

    return res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST / - Create product with optional image upload (admin only)
router.post('/', authenticate, authorizeAdmin, upload.single('image'), async (req: AuthRequest, res: Response) => {
  // If an image was uploaded, set image_url from file path
  if (req.file) {
    req.body.image_url = `/uploads/${req.file.filename}`;
  }

  const validation = validateProduct(req.body);
  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  const { name, price, category_id, description, image_url, active } = validation.data;

  try {
    const [product] = await db('product')
      .insert({
        name,
        price,
        category_id,
        description: description || null,
        image_url: image_url || null,
        active: active ?? true,
      })
      .returning(['id', 'category_id', 'name', 'description', 'price', 'image_url', 'active', 'created_at', 'updated_at']);

    return res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /:id - Update product (admin only)
router.put('/:id', authenticate, authorizeAdmin, upload.single('image'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // If an image was uploaded, set image_url from file path
  if (req.file) {
    req.body.image_url = `/uploads/${req.file.filename}`;
  }

  const validation = validateProduct(req.body);
  if (!validation.valid) {
    return res.status(400).json({ errors: validation.errors });
  }

  const { name, price, category_id, description, image_url, active } = validation.data;

  try {
    const [updated] = await db('product')
      .where({ id })
      .update({
        name,
        price,
        category_id,
        description: description ?? null,
        image_url: image_url ?? null,
        active: active ?? true,
        updated_at: db.fn.now(),
      })
      .returning(['id', 'category_id', 'name', 'description', 'price', 'image_url', 'active', 'created_at', 'updated_at']);

    if (!updated) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    return res.json(updated);
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// DELETE /:id - Soft delete (set active=false) (admin only)
router.delete('/:id', authenticate, authorizeAdmin, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const [updated] = await db('product')
      .where({ id })
      .update({ active: false, updated_at: db.fn.now() })
      .returning(['id', 'name', 'active']);

    if (!updated) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    return res.json({ message: 'Producto eliminado', product: updated });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
